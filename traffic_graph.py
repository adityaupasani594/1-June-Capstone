from __future__ import annotations

from typing import Any, Mapping, Sequence

import torch
from torch import nn
from torch import Tensor
import pennylane as qml
from torch_geometric.nn import MessagePassing
from torch_geometric.data import Data

NODE_FEATURES = (
    "traffic_volume",
    "average_speed",
    "lane_occupancy",
    "queue_length",
    "intersection_type",
)

EDGE_FEATURES = (
    "road_capacity",
    "segment_length",
    "road_quality",
    "speed_limit",
    "lane_count",
    "incident_flag",
)


class CompressionLayer(nn.Module):
    def __init__(self, input_dim: int = 128, output_dim: int = 8) -> None:
        super().__init__()
        self.input_dim = input_dim
        self.output_dim = output_dim
        self.projection = nn.Linear(input_dim, output_dim)

    def forward(self, x: Tensor) -> Tensor:
        if x.dim() != 2:
            raise ValueError("input embeddings must have shape [batch_size, 128]")
        if x.size(-1) != self.input_dim:
            raise ValueError(f"expected last dimension {self.input_dim}, got {x.size(-1)}")
        return self.projection(x)


def _normalize_edge_index(edge_index: Tensor | Sequence[Sequence[int]]) -> list[tuple[int, int]]:
    if isinstance(edge_index, Tensor):
        if edge_index.dim() != 2 or edge_index.size(0) != 2:
            raise ValueError("edge_index must have shape [2, num_edges]")
        return [
            (int(edge_index[0, column]), int(edge_index[1, column]))
            for column in range(edge_index.size(1))
        ]

    return [(int(source), int(target)) for source, target in edge_index]


def create_traffic_quantum_circuit(
    num_junctions: int,
    edge_index: Tensor | Sequence[Sequence[int]],
) -> callable:
    roads = _normalize_edge_index(edge_index)
    device = qml.device("default.qubit", wires=num_junctions)

    @qml.qnode(device, interface="torch")
    def circuit(theta: Tensor) -> Tensor:
        if theta.dim() != 1:
            raise ValueError("theta must be a one-dimensional tensor of junction angles")
        if theta.numel() != num_junctions:
            raise ValueError(f"expected {num_junctions} junction angles, got {theta.numel()}")

        qml.AngleEmbedding(theta, wires=range(num_junctions), rotation="Y")

        for source, target in roads:
            qml.CNOT(wires=[source, target])

        return [qml.expval(qml.PauliZ(wire)) for wire in range(num_junctions)]

    return circuit


def evaluate_traffic_quantum_circuit(
    theta: Tensor | Sequence[float],
    edge_index: Tensor | Sequence[Sequence[int]],
) -> Tensor:
    theta_tensor = torch.as_tensor(theta, dtype=torch.float32)
    circuit = create_traffic_quantum_circuit(theta_tensor.numel(), edge_index)
    return torch.as_tensor(circuit(theta_tensor), dtype=torch.float32)

class TrafficMessagePassingLayer(MessagePassing):
    def __init__(
        self,
        node_channels: int,
        edge_channels: int,
        weather_channels: int = 0,
        temporal_channels: int = 0,
        hidden_channels: int | None = None,
    ) -> None:
        super().__init__(aggr="add")
        self.node_channels = node_channels
        self.edge_channels = edge_channels
        self.weather_channels = weather_channels
        self.temporal_channels = temporal_channels
        self.hidden_channels = hidden_channels or node_channels

        message_input_channels = (
            node_channels + edge_channels + weather_channels + temporal_channels
        )
        self.message_mlp = nn.Sequential(
            nn.Linear(message_input_channels, self.hidden_channels),
            nn.ReLU(),
            nn.Linear(self.hidden_channels, node_channels),
        )
        self.batch_norm = nn.BatchNorm1d(node_channels)

    @staticmethod
    def _expand_context(context: Tensor | None, num_edges: int) -> Tensor | None:
        if context is None:
            return None
        if context.dim() == 1:
            return context.unsqueeze(0).expand(num_edges, -1)
        if context.size(0) == 1 and num_edges > 1:
            return context.expand(num_edges, -1)
        if context.size(0) != num_edges:
            raise ValueError(
                "context features must have shape [num_edges, channels] or [1, channels]"
            )
        return context

    def forward(
        self,
        x: Tensor,
        edge_index: Tensor,
        edge_attr: Tensor,
        weather_features: Tensor | None = None,
        temporal_features: Tensor | None = None,
    ) -> Tensor:
        edge_count = edge_index.size(1)
        weather_features = self._expand_context(weather_features, edge_count)
        temporal_features = self._expand_context(temporal_features, edge_count)

        aggregated_messages = self.propagate(
            edge_index,
            x=x,
            edge_attr=edge_attr,
            weather_features=weather_features,
            temporal_features=temporal_features,
        )
        updated = x + aggregated_messages
        return self.batch_norm(updated)

    def message(
        self,
        x_j: Tensor,
        edge_attr: Tensor,
        weather_features: Tensor | None,
        temporal_features: Tensor | None,
    ) -> Tensor:
        pieces = [x_j, edge_attr]
        if weather_features is not None:
            pieces.append(weather_features)
        if temporal_features is not None:
            pieces.append(temporal_features)
        message_input = torch.cat(pieces, dim=-1)
        return self.message_mlp(message_input)


def _encode_categorical_values(values: Sequence[Any]) -> tuple[Tensor, dict[Any, int]]:
    mapping: dict[Any, int] = {}
    encoded: list[float] = []

    for value in values:
        if isinstance(value, (int, float)):
            encoded.append(float(value))
            continue

        if value not in mapping:
            mapping[value] = len(mapping)
        encoded.append(float(mapping[value]))

    return torch.tensor(encoded, dtype=torch.float32), mapping


def _extract_feature_values(
    records: Sequence[Mapping[str, Any]],
    feature_names: Sequence[str],
) -> dict[str, Tensor | dict[Any, int]]:
    extracted: dict[str, Tensor | dict[Any, int]] = {}

    for feature_name in feature_names:
        values = [record[feature_name] for record in records]
        if all(isinstance(value, (int, float, bool)) for value in values):
            extracted[feature_name] = torch.tensor(values, dtype=torch.float32)
        else:
            tensor, mapping = _encode_categorical_values(values)
            extracted[feature_name] = tensor
            extracted[f"{feature_name}_mapping"] = mapping

    return extracted


def build_traffic_graph_data(
    junctions: Sequence[Mapping[str, Any]],
    roads: Sequence[Mapping[str, Any]],
    *,
    timestamp: float | int | None = None,
    timestamps: Sequence[float | int] | None = None,
) -> Data:
    """Build a PyG Data object for a traffic network.

    Each junction becomes a node and each road becomes an edge.
    Node features follow the NODE_FEATURES order and edge features
    follow the EDGE_FEATURES order.

    Use ``timestamp`` for a single snapshot, or ``timestamps`` for a
    dynamic sequence of snapshot times.
    """

    if not junctions:
        raise ValueError("junctions cannot be empty")
    if not roads:
        raise ValueError("roads cannot be empty")

    if timestamp is not None and timestamps is not None:
        raise ValueError("pass either timestamp or timestamps, not both")

    junction_ids = [junction["junction_id"] for junction in junctions]
    junction_to_index = {junction_id: index for index, junction_id in enumerate(junction_ids)}

    node_features = _extract_feature_values(junctions, NODE_FEATURES)
    x = torch.stack([node_features[feature_name] for feature_name in NODE_FEATURES], dim=1)

    edge_sources: list[int] = []
    edge_targets: list[int] = []
    edge_columns: list[Tensor] = []
    edge_features = _extract_feature_values(roads, EDGE_FEATURES)

    for road in roads:
        source_key = road.get("source_junction", road.get("source"))
        target_key = road.get("target_junction", road.get("target"))
        if source_key not in junction_to_index:
            raise KeyError(f"Unknown source junction: {source_key!r}")
        if target_key not in junction_to_index:
            raise KeyError(f"Unknown target junction: {target_key!r}")

        edge_sources.append(junction_to_index[source_key])
        edge_targets.append(junction_to_index[target_key])

    for feature_name in EDGE_FEATURES:
        edge_columns.append(edge_features[feature_name])

    edge_index = torch.tensor([edge_sources, edge_targets], dtype=torch.long)
    edge_attr = torch.stack(edge_columns, dim=1)

    data = Data(
        x=x,
        edge_index=edge_index,
        edge_attr=edge_attr,
        junction_id=junction_ids,
        road_count=len(roads),
        node_feature_names=NODE_FEATURES,
        edge_feature_names=EDGE_FEATURES,
    )

    if "intersection_type_mapping" in node_features:
        data.intersection_type_mapping = node_features["intersection_type_mapping"]
    if "road_quality_mapping" in edge_features:
        data.road_quality_mapping = edge_features["road_quality_mapping"]

    if timestamp is not None:
        data.timestamp = torch.tensor([timestamp], dtype=torch.float32)
    if timestamps is not None:
        data.timestamps = torch.tensor(list(timestamps), dtype=torch.float32)

    return data


if __name__ == "__main__":
    sample_junctions = [
        {
            "junction_id": "A",
            "traffic_volume": 1240,
            "average_speed": 35.5,
            "lane_occupancy": 0.72,
            "queue_length": 18,
            "intersection_type": "signalized",
        },
        {
            "junction_id": "B",
            "traffic_volume": 980,
            "average_speed": 42.1,
            "lane_occupancy": 0.61,
            "queue_length": 9,
            "intersection_type": "roundabout",
        },
    ]

    sample_roads = [
        {
            "source_junction": "A",
            "target_junction": "B",
            "road_capacity": 2200,
            "segment_length": 0.8,
            "road_quality": "good",
            "speed_limit": 50,
            "lane_count": 3,
            "incident_flag": 0,
        }
    ]

    traffic_data = build_traffic_graph_data(
        sample_junctions,
        sample_roads,
        timestamps=[1717200000, 1717200060],
    )
    print(traffic_data)