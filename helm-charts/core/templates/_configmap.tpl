{{/* Library template: renders a ConfigMap; consumer charts call include "tsg-core.cm" (dict "root" .) */}}
{{- define "tsg-core.cm" -}}
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ template "tsg-core.fullname" . }}-config
  labels: {{ include "tsg-core.labels" $ | nindent 4 }}
data:
  config.yaml: |-
    {{- tpl (.Values.config | toYaml) $ | nindent 4}}
{{- end }}
