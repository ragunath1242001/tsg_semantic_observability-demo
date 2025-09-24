{{- define "tsg-core.rolebinding" -}}
{{- if .Values.serviceAccount.create -}}
kind: RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
metadata:
  name: {{ printf "%s-binding" (include "tsg-core.serviceAccountName" .) }}
  labels:
    {{- include "tsg-core.labels" . | nindent 4 }}
subjects:
- kind: ServiceAccount
  name: {{ include "tsg-core.serviceAccountName" . }}
  namespace: {{ .Release.Namespace }}
roleRef:
 kind: Role
 name: {{ printf "%s-role" (include "tsg-core.serviceAccountName" .) }}
 apiGroup: rbac.authorization.k8s.io
{{- end }}
{{- end }}
