FROM kitware/pulse:4.3.1

# Pulse FastAPI sidecar — wraps the Pulse Physiology Engine in an HTTP surface.
# Keep Pulse's upstream NOTICE and LICENSE files intact.

RUN pip install --no-cache-dir \
      "pandas==2.2.*" \
      "fastapi==0.115.*" \
      "uvicorn[standard]==0.30.*"

WORKDIR /app
COPY server.py /app/server.py

ENV PULSE_STATE_FILE="/pulse/bin/states/StandardMale@0s.json" \
    PULSE_LOG_FILE="/tmp/pulse.log"

EXPOSE 8104

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s \
  CMD python3 -c "import urllib.request,sys; urllib.request.urlopen('http://localhost:8104/healthz',timeout=2)" || exit 1

# Pulse engine is single-threaded and stateful; run one worker.
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8104", "--workers", "1"]
