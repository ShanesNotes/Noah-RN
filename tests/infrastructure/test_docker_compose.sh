#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
COMPOSE_FILE="$REPO_ROOT/infrastructure/docker-compose.yml"
PASS=0
FAIL=0

assert_eq() {
    local desc="$1" expected="$2" actual="$3"
    if [[ "$expected" == "$actual" ]]; then
        echo "  PASS: $desc"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $desc"
        echo "    expected: $expected"
        echo "    actual:   $actual"
        FAIL=$((FAIL + 1))
    fi
}

assert_contains() {
    local desc="$1" needle="$2" haystack="$3"
    if echo "$haystack" | grep -Fqi "$needle"; then
        echo "  PASS: $desc"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $desc"
        echo "    expected to contain: $needle"
        echo "    actual: $haystack"
        FAIL=$((FAIL + 1))
    fi
}

assert_file_exists() {
    local desc="$1" path="$2"
    if [[ -f "$path" ]]; then
        echo "  PASS: $desc"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $desc"
        echo "    missing file: $path"
        FAIL=$((FAIL + 1))
    fi
}

yaml_keys() {
    local section="$1"
    awk -v section="$section" '
        $1 == section ":" { in_section = 1; next }
        in_section && /^[^[:space:]]/ { exit }
        in_section && /^  [A-Za-z0-9_.-]+:$/ {
            key = $0
            sub(/^  /, "", key)
            sub(/:$/, "", key)
            print key
        }
    ' "$COMPOSE_FILE"
}

service_block() {
    local service="$1"
    awk -v service="$service" '
        $0 == "  " service ":" { in_service = 1; print; next }
        in_service && /^  [A-Za-z0-9_.-]+:$/ { exit }
        in_service { print }
    ' "$COMPOSE_FILE"
}

have_docker_compose_json() {
    command -v docker >/dev/null 2>&1 &&
        docker compose version >/dev/null 2>&1 &&
        command -v jq >/dev/null 2>&1
}

echo "=== Docker Compose Stack ==="

assert_file_exists "docker-compose.yml exists" "$COMPOSE_FILE"

if [[ $FAIL -eq 0 ]]; then
    if have_docker_compose_json; then
        CONFIG_JSON="$(docker compose -f "$COMPOSE_FILE" config --format json)"

        assert_eq "exactly two services" "2" "$(jq '.services | length' <<<"$CONFIG_JSON")"
        assert_eq "service names are hapi and hapi-postgres" "hapi,hapi-postgres" \
            "$(jq -r '.services | keys_unsorted | sort | join(",")' <<<"$CONFIG_JSON")"
        assert_eq "HAPI image pinned" "hapiproject/hapi:v8.8.0-1" \
            "$(jq -r '.services.hapi.image' <<<"$CONFIG_JSON")"
        assert_eq "HAPI container_name" "hapi-fhir" \
            "$(jq -r '.services.hapi.container_name' <<<"$CONFIG_JSON")"
        assert_eq "Postgres image pinned" "postgres:16-alpine" \
            "$(jq -r '.services["hapi-postgres"].image' <<<"$CONFIG_JSON")"
        assert_eq "Postgres container_name" "hapi-postgres" \
            "$(jq -r '.services["hapi-postgres"].container_name' <<<"$CONFIG_JSON")"

        port_mapping="$(jq -r '.services.hapi.ports[] | if type == "string" then . else "\(.published):\(.target)" end' <<<"$CONFIG_JSON")"
        assert_contains "HAPI exposes 8080:8080" "8080:8080" "$port_mapping"

        assert_eq "bulk import enabled" "true" \
            "$(jq -r '.services.hapi.environment["hapi.fhir.bulk_import_enabled"]' <<<"$CONFIG_JSON")"
        assert_eq "referential integrity on write disabled" "false" \
            "$(jq -r '.services.hapi.environment["hapi.fhir.enforce_referential_integrity_on_write"]' <<<"$CONFIG_JSON")"
        assert_eq "referential integrity on delete disabled" "false" \
            "$(jq -r '.services.hapi.environment["hapi.fhir.enforce_referential_integrity_on_delete"]' <<<"$CONFIG_JSON")"
        assert_eq "Hibernate dialect" "ca.uhn.fhir.jpa.model.dialect.HapiFhirPostgresDialect" \
            "$(jq -r '.services.hapi.environment["spring.jpa.properties.hibernate.dialect"]' <<<"$CONFIG_JSON")"
        assert_eq "JDBC URL points at hapi-postgres" "jdbc:postgresql://hapi-postgres:5432/hapi" \
            "$(jq -r '.services.hapi.environment["spring.datasource.url"]' <<<"$CONFIG_JSON")"
        assert_eq "HAPI datasource username" "admin" \
            "$(jq -r '.services.hapi.environment["spring.datasource.username"]' <<<"$CONFIG_JSON")"
        assert_eq "HAPI datasource password" "admin" \
            "$(jq -r '.services.hapi.environment["spring.datasource.password"]' <<<"$CONFIG_JSON")"

        hapi_memory="$(jq -r '.services.hapi.mem_limit // .services.hapi.deploy.resources.limits.memory // empty' <<<"$CONFIG_JSON")"
        assert_eq "HAPI memory limit is 4 GB" "4g" "$(tr '[:upper:]' '[:lower:]' <<<"$hapi_memory")"
        assert_eq "persistent Postgres volume" "hapi-data" \
            "$(jq -r '.volumes | keys_unsorted | sort | join(",")' <<<"$CONFIG_JSON")"
        assert_eq "Postgres volume mounted at data directory" "hapi-data:/var/lib/postgresql/data" \
            "$(jq -r '.services["hapi-postgres"].volumes[]' <<<"$CONFIG_JSON")"
        assert_eq "Postgres database name" "hapi" \
            "$(jq -r '.services["hapi-postgres"].environment.POSTGRES_DB' <<<"$CONFIG_JSON")"
        assert_eq "Postgres username" "admin" \
            "$(jq -r '.services["hapi-postgres"].environment.POSTGRES_USER' <<<"$CONFIG_JSON")"
        assert_eq "Postgres password" "admin" \
            "$(jq -r '.services["hapi-postgres"].environment.POSTGRES_PASSWORD' <<<"$CONFIG_JSON")"
        assert_eq "depends_on waits for Postgres healthcheck" "service_healthy" \
            "$(jq -r '.services.hapi.depends_on["hapi-postgres"].condition' <<<"$CONFIG_JSON")"
        assert_contains "Postgres healthcheck probes hapi with admin user" "pg_isready -U admin -d hapi" \
            "$(jq -r '.services["hapi-postgres"].healthcheck.test | join(" ")' <<<"$CONFIG_JSON")"
        assert_eq "no extra service dependencies" "1" \
            "$(jq '.services.hapi.depends_on | length' <<<"$CONFIG_JSON")"
    else
        compose_text="$(<"$COMPOSE_FILE")"
        hapi_block="$(service_block hapi)"
        postgres_block="$(service_block hapi-postgres)"
        service_count="$(yaml_keys services | wc -l | tr -d ' ')"
        volume_count="$(yaml_keys volumes | wc -l | tr -d ' ')"

        assert_eq "exactly two services" "2" "$service_count"
        assert_contains "service name hapi present" "hapi" "$(yaml_keys services | tr '\n' ',')"
        assert_contains "service name hapi-postgres present" "hapi-postgres" "$(yaml_keys services | tr '\n' ',')"
        assert_contains "HAPI image pinned" "image: hapiproject/hapi:v8.8.0-1" "$hapi_block"
        assert_contains "HAPI container_name" "container_name: hapi-fhir" "$hapi_block"
        assert_contains "Postgres image pinned" "image: postgres:16-alpine" "$postgres_block"
        assert_contains "Postgres container_name" "container_name: hapi-postgres" "$postgres_block"
        assert_contains "HAPI exposes 8080:8080" '"8080:8080"' "$hapi_block"
        assert_contains "bulk import enabled" "hapi.fhir.bulk_import_enabled=true" "$hapi_block"
        assert_contains "referential integrity on write disabled" "hapi.fhir.enforce_referential_integrity_on_write=false" "$hapi_block"
        assert_contains "referential integrity on delete disabled" "hapi.fhir.enforce_referential_integrity_on_delete=false" "$hapi_block"
        assert_contains "Hibernate dialect" "ca.uhn.fhir.jpa.model.dialect.HapiFhirPostgresDialect" "$hapi_block"
        assert_contains "JDBC URL points at hapi-postgres" "jdbc:postgresql://hapi-postgres:5432/hapi" "$hapi_block"
        assert_contains "HAPI datasource username" "spring.datasource.username=admin" "$hapi_block"
        assert_contains "HAPI datasource password" "spring.datasource.password=admin" "$hapi_block"
        assert_contains "HAPI memory limit is 4 GB" "mem_limit: 4g" "$hapi_block"
        assert_eq "persistent Postgres volume" "1" "$volume_count"
        assert_contains "Postgres database name" "POSTGRES_DB: hapi" "$postgres_block"
        assert_contains "Postgres username" "POSTGRES_USER: admin" "$postgres_block"
        assert_contains "Postgres password" "POSTGRES_PASSWORD: admin" "$postgres_block"
        assert_contains "Postgres volume mounted at data directory" "hapi-data:/var/lib/postgresql/data" "$postgres_block"
        assert_contains "depends_on waits for Postgres healthcheck" "condition: service_healthy" "$hapi_block"
        assert_contains "Postgres healthcheck probes hapi with admin user" "pg_isready -U admin -d hapi" "$postgres_block"
        if grep -Eq '^version:' "$COMPOSE_FILE"; then
            echo "  FAIL: obsolete compose version key absent"
            FAIL=$((FAIL + 1))
        else
            echo "  PASS: obsolete compose version key absent"
            PASS=$((PASS + 1))
        fi

        depends_on_count="$(awk '
            $0 ~ /^    depends_on:$/ { in_depends = 1; next }
            in_depends && /^[^[:space:]]/ { exit }
            in_depends && /^      [A-Za-z0-9_.-]+:$/ { count++ }
            END { print count + 0 }
        ' "$COMPOSE_FILE")"
        assert_eq "no extra service dependencies" "1" "$depends_on_count"
    fi
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
exit "$FAIL"
