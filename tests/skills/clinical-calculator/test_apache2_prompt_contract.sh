#!/usr/bin/env bash
# Redirect: clinical-calculator was split into neuro/risk/acuity-calculator (2026-04-12)
# APACHE II tests now live in tests/skills/acuity-calculator/
exec "$(dirname "${BASH_SOURCE[0]}")/../../skills/acuity-calculator/test_apache2_prompt_contract.sh" "$@"
