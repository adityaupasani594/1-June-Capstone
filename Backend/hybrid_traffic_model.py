from __future__ import annotations

from typing import Sequence

import pennylane as qml
import torch
from torch import Tensor, nn
from torch_geometric.data import Data

from traffic_graph import CompressionLayer, TrafficMessagePassingLayer


class TrafficGNN(nn.Module):
    def __init__(
        self,
        node_input_dim: int = 5,
        edge_input_dim: int = 6,
        hidden_dim: int = 128,
        num_layers: int = 2,
        weather_channels: int = 0,
        temporal_channels: int = 0,
    ) -> None:
        super().__init__()
        if num_layers <= 0:
            raise ValueError("num_layers must be positive")

        self.input_projection = nn.Linear(node_input_dim, hidden_dim)
        self.layers = nn.ModuleList(
            [
                TrafficMessagePassingLayer(
                    node_channels=hidden_dim,
                    edge_channels=edge_input_dim,
                    weather_channels=weather_channels,
                    temporal_channels=temporal_channels,
                    hidden_channels=hidden_dim,
                )
                for _ in range(num_layers)
            ]
        )

    def forward(
        self,
        x: Tensor,
        edge_index: Tensor,
        edge_attr: Tensor,
        weather_features: Tensor | None = None,
        temporal_features: Tensor | None = None,
    ) -> Tensor:
        node_embeddings = self.input_projection(x)
        for layer in self.layers:
            node_embeddings = layer(
                node_embeddings,
                edge_index,
                edge_attr,
                weather_features=weather_features,
                temporal_features=temporal_features,
            )
        return node_embeddings


class QuantumLayer(nn.Module):
    def __init__(
        self,
        input_dim: int = 8,
        num_qubits: int = 8,
        num_layers: int = 2,
    ) -> None:
        super().__init__()
        if input_dim != num_qubits:
            raise ValueError("input_dim must match num_qubits for the quantum layer")
        if num_layers <= 0:
            raise ValueError("num_layers must be positive")

        self.input_dim = input_dim
        self.num_qubits = num_qubits
        self.num_layers = num_layers
        self.weights = nn.Parameter(torch.randn(num_layers, num_qubits, 3) * 0.01)
        self._device = qml.device("default.qubit", wires=num_qubits)
        self._circuit = self._build_circuit()

    def _build_circuit(self):
        num_qubits = self.num_qubits
        num_layers = self.num_layers

        @qml.qnode(self._device, interface="torch")
        def circuit(inputs: Tensor, weights: Tensor) -> tuple[Tensor, ...]:
            if inputs.shape != (num_qubits,):
                raise ValueError(f"inputs must have shape [{num_qubits}]")
            if weights.shape != (num_layers, num_qubits, 3):
                raise ValueError(
                    f"weights must have shape [{num_layers}, {num_qubits}, 3], got {tuple(weights.shape)}"
                )

            qml.AngleEmbedding(inputs, wires=range(num_qubits), rotation="Y")

            for layer_index in range(num_layers):
                layer_weights = weights[layer_index]
                for qubit in range(num_qubits):
                    theta1, theta2, theta3 = layer_weights[qubit]
                    qml.RZ(theta1, wires=qubit)
                    qml.RY(theta2, wires=qubit)
                    qml.RZ(theta3, wires=qubit)

                for wire in range(num_qubits - 1):
                    qml.CNOT(wires=[wire, wire + 1])
                if num_qubits > 2:
                    qml.CNOT(wires=[num_qubits - 1, 0])

            return tuple(qml.expval(qml.PauliZ(wire)) for wire in range(num_qubits))

        return circuit

    def forward(self, x: Tensor) -> Tensor:
        if x.dim() != 2 or x.size(-1) != self.input_dim:
            raise ValueError(f"expected input shape [batch_size, {self.input_dim}]")

        outputs = [
            torch.stack(self._circuit(sample, self.weights))
            for sample in x
        ]
        return torch.stack(outputs, dim=0).to(dtype=x.dtype)


class FusionLayer(nn.Module):
    def __init__(self, classical_dim: int = 8, quantum_dim: int = 8, fused_dim: int = 128) -> None:
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(classical_dim + quantum_dim, fused_dim),
            nn.ReLU(),
            nn.LayerNorm(fused_dim),
            nn.Linear(fused_dim, fused_dim),
            nn.ReLU(),
        )

    def forward(self, classical_embeddings: Tensor, quantum_embeddings: Tensor) -> Tensor:
        fused_input = torch.cat([classical_embeddings, quantum_embeddings], dim=-1)
        return self.network(fused_input)


class EdgePredictor(nn.Module):
    def __init__(
        self,
        node_dim: int = 128,
        edge_dim: int = 6,
        hidden_dim: int = 128,
        output_dim: int = 3,
    ) -> None:
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(node_dim * 4 + edge_dim, hidden_dim),
            nn.ReLU(),
            nn.LayerNorm(hidden_dim),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, output_dim),
        )

    def forward(self, node_embeddings: Tensor, edge_index: Tensor, edge_attr: Tensor) -> Tensor:
        source_nodes = edge_index[0]
        target_nodes = edge_index[1]

        source_embeddings = node_embeddings[source_nodes]
        target_embeddings = node_embeddings[target_nodes]
        edge_features = edge_attr

        predictor_input = torch.cat(
            [
                source_embeddings,
                target_embeddings,
                torch.abs(source_embeddings - target_embeddings),
                source_embeddings * target_embeddings,
                edge_features,
            ],
            dim=-1,
        )
        return self.network(predictor_input)


class HybridTrafficModel(nn.Module):
    def __init__(
        self,
        node_input_dim: int = 5,
        edge_input_dim: int = 6,
        gnn_hidden_dim: int = 128,
        quantum_dim: int = 8,
        gnn_layers: int = 2,
        quantum_layers: int = 2,
        fusion_dim: int = 128,
        predictor_hidden_dim: int = 128,
        weather_channels: int = 0,
        temporal_channels: int = 0,
    ) -> None:
        super().__init__()
        self.traffic_gnn = TrafficGNN(
            node_input_dim=node_input_dim,
            edge_input_dim=edge_input_dim,
            hidden_dim=gnn_hidden_dim,
            num_layers=gnn_layers,
            weather_channels=weather_channels,
            temporal_channels=temporal_channels,
        )
        self.compression = CompressionLayer(input_dim=gnn_hidden_dim, output_dim=quantum_dim)
        self.quantum_layer = QuantumLayer(input_dim=quantum_dim, num_qubits=quantum_dim, num_layers=quantum_layers)
        self.fusion = FusionLayer(classical_dim=quantum_dim, quantum_dim=quantum_dim, fused_dim=fusion_dim)
        self.edge_predictor = EdgePredictor(
            node_dim=fusion_dim,
            edge_dim=edge_input_dim,
            hidden_dim=predictor_hidden_dim,
            output_dim=3,
        )

    def forward(
        self,
        data: Data,
        weather_features: Tensor | None = None,
        temporal_features: Tensor | None = None,
    ) -> Tensor:
        node_embeddings = self.traffic_gnn(
            data.x,
            data.edge_index,
            data.edge_attr,
            weather_features=weather_features,
            temporal_features=temporal_features,
        )
        compressed_embeddings = self.compression(node_embeddings)
        quantum_embeddings = self.quantum_layer(compressed_embeddings)
        fused_embeddings = self.fusion(compressed_embeddings, quantum_embeddings)
        return self.edge_predictor(fused_embeddings, data.edge_index, data.edge_attr)


if __name__ == "__main__":
    from traffic_graph import build_traffic_graph_data

    junctions = [
        {
            "junction_id": "A",
            "traffic_volume": 1000,
            "average_speed": 35.0,
            "lane_occupancy": 0.7,
            "queue_length": 14,
            "intersection_type": "signalized",
        },
        {
            "junction_id": "B",
            "traffic_volume": 900,
            "average_speed": 38.0,
            "lane_occupancy": 0.64,
            "queue_length": 11,
            "intersection_type": "roundabout",
        },
        {
            "junction_id": "C",
            "traffic_volume": 850,
            "average_speed": 31.5,
            "lane_occupancy": 0.68,
            "queue_length": 16,
            "intersection_type": "signalized",
        },
    ]

    roads = [
        {
            "source_junction": "A",
            "target_junction": "B",
            "road_capacity": 2000,
            "segment_length": 1.2,
            "road_quality": "good",
            "speed_limit": 50,
            "lane_count": 3,
            "incident_flag": 0,
        },
        {
            "source_junction": "B",
            "target_junction": "C",
            "road_capacity": 1800,
            "segment_length": 0.9,
            "road_quality": "fair",
            "speed_limit": 45,
            "lane_count": 2,
            "incident_flag": 1,
        },
    ]

    graph = build_traffic_graph_data(junctions, roads, timestamps=[1717200000, 1717200060])
    model = HybridTrafficModel()
    predictions = model(graph)
    print(predictions)
    print(predictions.shape)