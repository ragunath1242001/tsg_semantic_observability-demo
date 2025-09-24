{{- define "tsg-core.role" -}}
{{- if .Values.serviceAccount.create -}}
kind: Role
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: {{ printf "%s-role" (include "tsg-core.serviceAccountName" .) }}
  labels:
    {{- include "tsg-core.labels" . | nindent 4 }}
rules:
{{- toYaml .Values.serviceAccount.rules | nindent 2 }}
{{- end }}
{{- end }}
