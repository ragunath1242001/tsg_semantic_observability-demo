{{- define "tsg-core.ingress" -}}
{{- if .Values.ingress.enabled }}
{{- with .Values.ingress }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ template "tsg-core.fullname" $ }}-ingress
  labels: {{ include "tsg-core.labels" $ | nindent 4 }}
  annotations:
    {{- if .clusterIssuer }}
    cert-manager.io/cluster-issuer: {{ .clusterIssuer }}
    {{- end }}
    {{- with .annotations }}
    {{- tpl (toYaml . ) $ | nindent 4 }}
    {{- end }}
spec:
  ingressClassName: {{ .class | default "nginx" }} 
  tls:
  - hosts:
    - {{ required "A hostname under the key 'host' is required to enable ingresses" $.Values.host }}
    secretName: {{ $.Values.host }}-tls-secret
  rules:
  - host: {{ $.Values.host }}
    http:
      paths:
      {{- range .paths }}
      - backend:
          service:
            name: {{ template "tsg-core.fullname" $ }}
            port: 
              number: {{ $.Values.config.server.port | default 3000 }}
        path: {{ tpl .path $ }}
        pathType: {{ .type }}
      {{- end }}
{{- end }}
{{- end }}
{{- end }}
