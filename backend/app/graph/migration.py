from typing import Dict, Any
from .registry import NodeRegistry

class ProjectMigrationManager:
    """
    Schema Migration Manager for .rei-signal Projects (2.0 -> 2.1).
    Translates legacy node names to canonical types, injects environment hashes,
    and preserves unknown node types.
    """

    @classmethod
    def migrate_to_2_1(cls, project_spec: Dict[str, Any]) -> Dict[str, Any]:
        spec_copy = dict(project_spec)
        spec_copy["formatVersion"] = "2.1"

        graph = spec_copy.get("graph", {})
        nodes = graph.get("nodes", [])

        migrated_nodes = []
        for n in nodes:
            n_copy = dict(n)
            orig_type = n_copy.get("type", "")
            canonical_type = NodeRegistry.resolve_canonical_type(orig_type)
            n_copy["type"] = canonical_type
            migrated_nodes.append(n_copy)

        graph["nodes"] = migrated_nodes
        spec_copy["graph"] = graph

        env = spec_copy.get("environment", {})
        env["dspEngineVersion"] = "2.1.0"
        env["nodeRegistryVersion"] = "2.1.0"
        spec_copy["environment"] = env

        return spec_copy
