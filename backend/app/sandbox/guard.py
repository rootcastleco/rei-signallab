"""
Static AST policy guard for the Python DSP sandbox.

Substring blacklists ("is 'import os' in the source?") are not a security
boundary — `__import__('o' + 's')` walks straight through one. This module
parses the script instead and rejects the constructs that actually enable
sandbox escapes:

  * imports of anything outside the numeric/plotting allowlist
  * dunder access, which is the entry point for the `().__class__.__base__
    .__subclasses__()` traversal that reaches arbitrary types
  * the reflection and code-loading builtins (`getattr`, `eval`, `open`, ...)

Rejection happens before the interpreter ever sees the code.
"""

import ast
from typing import Iterable, Optional, Set

#: Modules a DSP script is allowed to import. Root package names only —
#: submodules of an allowed root (``scipy.signal``) are permitted.
ALLOWED_IMPORT_ROOTS: Set[str] = {
    "numpy",
    "scipy",
    "matplotlib",
    "math",
    "cmath",
    "random",
    "statistics",
    "itertools",
    "functools",
    "operator",
    "collections",
    "decimal",
    "fractions",
    "json",
    "re",
    "typing",
    "dataclasses",
    "enum",
    "warnings",
}

#: Builtins that read, write or synthesise code and namespaces. Even with a
#: restricted ``__builtins__`` these are blocked statically so that a future
#: widening of the runtime namespace cannot silently open a hole.
FORBIDDEN_NAMES: Set[str] = {
    "__import__",
    "breakpoint",
    "compile",
    "delattr",
    "eval",
    "exec",
    "exit",
    "getattr",
    "globals",
    "help",
    "input",
    "locals",
    "memoryview",
    "open",
    "quit",
    "setattr",
    "super",
    "vars",
}

#: Attribute names that expose the object graph or the import machinery.
FORBIDDEN_ATTRIBUTES: Set[str] = {
    "mro",
    "gi_frame",
    "cr_frame",
    "f_globals",
    "f_locals",
    "f_builtins",
    "func_globals",
}


class SandboxPolicyError(Exception):
    """Raised when a script violates the sandbox policy."""

    def __init__(self, message: str, lineno: Optional[int] = None):
        self.lineno = lineno
        super().__init__(f"{message} (line {lineno})" if lineno else message)


def _is_dunder(name: str) -> bool:
    return name.startswith("__") or name.endswith("__")


class _PolicyVisitor(ast.NodeVisitor):
    def __init__(self, allowed_roots: Set[str]):
        self.allowed_roots = allowed_roots

    # -- imports -----------------------------------------------------------

    def _check_module(self, module: Optional[str], node: ast.AST) -> None:
        root = (module or "").split(".")[0]
        if root not in self.allowed_roots:
            raise SandboxPolicyError(
                f"Import of module '{module or '?'}' is not permitted in the DSP sandbox. "
                f"Allowed roots: {', '.join(sorted(self.allowed_roots))}",
                getattr(node, "lineno", None),
            )

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            self._check_module(alias.name, node)
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        if node.level:
            raise SandboxPolicyError(
                "Relative imports are not permitted in the DSP sandbox.", node.lineno
            )
        self._check_module(node.module, node)
        self.generic_visit(node)

    # -- identifiers -------------------------------------------------------

    def visit_Name(self, node: ast.Name) -> None:
        if _is_dunder(node.id):
            raise SandboxPolicyError(
                f"Access to dunder identifier '{node.id}' is not permitted in the DSP sandbox.",
                node.lineno,
            )
        if node.id in FORBIDDEN_NAMES:
            raise SandboxPolicyError(
                f"Use of restricted builtin '{node.id}' is not permitted in the DSP sandbox.",
                node.lineno,
            )
        self.generic_visit(node)

    def visit_Attribute(self, node: ast.Attribute) -> None:
        if _is_dunder(node.attr):
            raise SandboxPolicyError(
                f"Access to dunder attribute '.{node.attr}' is not permitted in the DSP sandbox.",
                node.lineno,
            )
        if node.attr in FORBIDDEN_ATTRIBUTES:
            raise SandboxPolicyError(
                f"Access to attribute '.{node.attr}' is not permitted in the DSP sandbox.",
                node.lineno,
            )
        self.generic_visit(node)

    # -- binding forms -----------------------------------------------------
    # A script may not *define* a dunder either; `__builtins__ = x` and
    # `class C: __getattr__ = ...` are both namespace attacks.

    def _check_binding(self, name: str, node: ast.AST) -> None:
        if _is_dunder(name):
            raise SandboxPolicyError(
                f"Binding the dunder name '{name}' is not permitted in the DSP sandbox.",
                getattr(node, "lineno", None),
            )

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._check_binding(node.name, node)
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self._check_binding(node.name, node)
        self.generic_visit(node)

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        self._check_binding(node.name, node)
        self.generic_visit(node)

    def visit_arg(self, node: ast.arg) -> None:
        self._check_binding(node.arg, node)
        self.generic_visit(node)

    def visit_alias(self, node: ast.alias) -> None:
        if node.asname:
            self._check_binding(node.asname, node)
        self.generic_visit(node)


def validate_script(
    source: str,
    max_bytes: int,
    allowed_roots: Optional[Iterable[str]] = None,
) -> ast.Module:
    """
    Parse and policy-check ``source``.

    Returns the parsed module on success; raises :class:`SandboxPolicyError`
    on any policy violation or syntax error.
    """
    encoded_length = len(source.encode("utf-8"))
    if encoded_length > max_bytes:
        raise SandboxPolicyError(
            f"Script size {encoded_length} bytes exceeds the sandbox limit of {max_bytes} bytes."
        )

    try:
        tree = ast.parse(source, mode="exec")
    except SyntaxError as exc:
        raise SandboxPolicyError(f"Script contains a syntax error: {exc.msg}", exc.lineno) from exc

    roots = set(allowed_roots) if allowed_roots is not None else ALLOWED_IMPORT_ROOTS
    _PolicyVisitor(roots).visit(tree)
    return tree
