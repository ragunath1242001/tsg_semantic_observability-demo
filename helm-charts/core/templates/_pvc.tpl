{{- define "tsg-core.pvc" -}}
{{- if .Values.persistentVolume }}
{{- with .Values.persistentVolume }}
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: {{ template "tsg-core.fullname" $ }}-pvc
  labels: {{ include "tsg-core.labels" $ | nindent 4 }}
spec:
  accessModes:
    - {{ .accessModes | default "ReadWriteOnce" }}
  storageClassName: {{ .storageClassName | default "default" }}
  resources:
    requests:
      storage: {{ .storageSize }}
  {{- end }}
{{- end }}
{{- end -}}