from __future__ import annotations

from typing import Sequence

import torch
from torch import Tensor, nn
import pennylane as qml


def _normalize_edge_index(edge_index: Tensor | Sequence[Sequence[int]]) -> list[tuple[int, int]]:
    if isinstance(edge_index, Tensor):
        if edge_index.dim() != 2 or edge_index.size(0) != 2:
            raise ValueError("edge_index must have shape [2, num_edges]")
        return [
            (int(edge_index[0, column]), int(edge_index[1, column]))
            for column in range(edge_index.size(1))
        ]

    return [(int(source), int(target)) for source, target in edge_index]


class TrainableVariationalQuantumCircuit(nn.Module):
    """Trainable layered variational circuit with graph-based entanglement.

    For each qubit in each layer, the circuit applies:
    RZ(theta1) -> RY(theta2) -> RZ(theta3)

    After each variational layer, it applies one CNOT per edge in edge_index.
    The output is the expectation value of PauliZ on every qubit.
    """

    def __init__(
        self,
        num_qubits: int,
        edge_index: Tensor | Sequence[Sequence[int]],
        num_layers: int = 1,
    ) -> None:
        super().__init__()
        if num_qubits <= 0:
            raise ValueError("num_qubits must be positive")
        if num_layers <= 0:
            raise ValueError("num_layers must be positive")

        self.num_qubits = num_qubits
        self.num_layers = num_layers
        self.edges = _normalize_edge_index(edge_index)

        self.weights = nn.Parameter(torch.randn(num_layers, num_qubits, 3) * 0.01)

        self._device = qml.device("default.qubit", wires=num_qubits)
        self._circuit = self._build_circuit()

    def _build_circuit(self):
        edges = self.edges
        num_qubits = self.num_qubits
        num_layers = self.num_layers

        @qml.qnode(self._device, interface="torch")
        def circuit(weights: Tensor) -> Tensor:
            if weights.shape != (num_layers, num_qubits, 3):
                raise ValueError(
                    f"weights must have shape [{num_layers}, {num_qubits}, 3], got {tuple(weights.shape)}"
                )

            for layer_index in range(num_layers):
                layer_weights = weights[layer_index]
                for qubit in range(num_qubits):
                    theta1, theta2, theta3 = layer_weights[qubit]
                    qml.RZ(theta1, wires=qubit)
                    qml.RY(theta2, wires=qubit)
                    qml.RZ(theta3, wires=qubit)

                for source, target in edges:
                    qml.CNOT(wires=[source, target])

            return [qml.expval(qml.PauliZ(wire)) for wire in range(num_qubits)]

        return circuit

    def forward(self) -> Tensor:
        return torch.as_tensor(self._circuit(self.weights), dtype=torch.float32)

    def measure_all_qubits(self) -> Tensor:
        """Return expval(PauliZ(i)) for every qubit as a [num_qubits] tensor."""
        return self.forward()


if __name__ == "__main__":
    sample_edges = [(0, 1), (1, 2), (2, 3)]
    circuit = TrainableVariationalQuantumCircuit(num_qubits=4, edge_index=sample_edges, num_layers=2)
    output = circuit()
    print(output)
    print(output.shape)