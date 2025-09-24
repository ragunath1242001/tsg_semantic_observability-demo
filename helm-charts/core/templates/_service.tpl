{{- define "tsg-core.service" -}}
apiVersion: v1
kind: Service
metadata:
  name: {{ template "tsg-core.fullname" . }}
  labels: {{ include "tsg-core.labels" $ | nindent 4 }}
spec:
  type: ClusterIP
  ports:
    - port: {{ $.Values.config.server.port | default 3000 }}
      targetPort: http
      protocol: TCP
      name: http
  selector:
    app.kubernetes.io/name: {{ template "tsg-core.fullname" . }}
    app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
