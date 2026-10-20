# Local security patch

This is a local fork of `braces` 3.0.3, retained under its upstream MIT license.
It rejects brace and parenthesis nesting deeper than 100 levels while parsing,
so recursive AST walkers cannot exhaust the JavaScript call stack on untrusted
patterns. This addresses GHSA-vfj7-8cjw-p6xm (CVE-2026-93687).

Replace this fork with an upstream release that includes equivalent nesting
limits once one is available.
