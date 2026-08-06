"""
Documentation contract suite.

The docs previously advertised a `WS /ws/stream` endpoint and a
`POST /api/render/plot` endpoint that the application never implemented, and a
node count that drifted from the registry. These tests make the claims
verifiable so they cannot silently diverge again.
"""

import pathlib
import re

import pytest

from app.graph.registry import NodeRegistry
from app.main import app

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
DOC_FILES = [
    REPO_ROOT / "README.md",
    REPO_ROOT / "docs" / "WIKI.md",
    REPO_ROOT / "docs" / "DEPLOYMENT.md",
]

def _implemented_paths() -> set:
    return {route.path for route in app.routes if hasattr(route, "methods")}


def _is_documented_path_served(path: str, implemented: set) -> bool:
    # A doc may summarise a family of routes as `/api/srw/*` or `/api/**`;
    # that is satisfied when at least one real route sits under the prefix.
    if path.endswith("*"):
        prefix = path.rstrip("*")
        return any(route.startswith(prefix) for route in implemented)
    return path in implemented


def _documented_api_paths(text: str) -> set:
    """API paths appearing in a Markdown table cell or inline code span."""
    paths = set()
    for raw in re.findall(r"`(/api/[^`\s]*)`", text):
        # Strip templating noise; keep FastAPI-style {param} segments intact.
        paths.add(raw.rstrip(".,;)"))
    return paths


@pytest.mark.parametrize("doc", DOC_FILES, ids=lambda p: p.name)
def test_documented_endpoints_exist(doc):
    if not doc.exists():
        pytest.skip(f"{doc.name} not present in this checkout")

    implemented = _implemented_paths()
    documented = _documented_api_paths(doc.read_text(encoding="utf-8"))

    missing = sorted(
        path for path in documented
        if not _is_documented_path_served(path, implemented)
    )
    assert not missing, (
        f"{doc.name} documents endpoints the application does not serve: {missing}"
    )


@pytest.mark.parametrize("doc", DOC_FILES, ids=lambda p: p.name)
def test_docs_do_not_advertise_websockets(doc):
    """No WebSocket route exists; the docs must not promise one."""
    if not doc.exists():
        pytest.skip(f"{doc.name} not present in this checkout")

    assert not any(getattr(route, "path", "").startswith("/ws") for route in app.routes)

    text = doc.read_text(encoding="utf-8")
    assert "/ws/stream" not in text, f"{doc.name} references a WebSocket route that does not exist"


@pytest.mark.parametrize("doc", DOC_FILES, ids=lambda p: p.name)
def test_documented_node_count_matches_registry(doc):
    """Any 'N canonical ... nodes' claim must match the live registry."""
    if not doc.exists():
        pytest.skip(f"{doc.name} not present in this checkout")

    actual = len(NodeRegistry.list_all())
    text = doc.read_text(encoding="utf-8")

    claims = [
        int(match)
        for match in re.findall(r"(\d+)\+?\s+canonical\s+(?:typed\s+)?DSP", text, re.I)
    ]
    for claim in claims:
        assert claim == actual, (
            f"{doc.name} claims {claim} canonical nodes but the registry holds {actual}"
        )


def test_registry_node_count_is_stable():
    """
    Guards the number the docs are pinned to. Update this and the docs together
    when nodes are added.
    """
    assert len(NodeRegistry.list_all()) == 69
