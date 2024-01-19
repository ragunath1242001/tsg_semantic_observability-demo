{{/*
Expand the name of the chart.
*/}}
{{- define "http-data-plane.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "http-data-plane.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "http-data-plane.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "http-data-plane.labels" -}}
helm.sh/chart: {{ include "http-data-plane.chart" . }}
{{ include "http-data-plane.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "http-data-plane.selectorLabels" -}}
app.kubernetes.io/name: {{ include "http-data-plane.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "http-data-plane.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "http-data-plane.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "recurseSecretConfig" -}}
{{- $map := first . -}}
{{- $label := last . -}}
{{- range $key, $val := $map -}}
  {{- $sublabel := snakecase $key | upper -}}
  {{- if not (empty $label) -}}
    {{- $sublabel = printf "%s__%s" $label $sublabel -}}
  {{- end -}}
  {{- if kindOf $val | eq "map" -}}
    {{- if and (hasKey $val "name") (hasKey $val "key")}}
- name: {{ $sublabel | quote }}
  valueFrom:
    secretKeyRef:
      name: {{ $val.name }}
      key: {{ $val.key }}
    {{- else }}
    {{- list $val $sublabel | include "recurseSecretConfig" -}}
    {{- end }}
  {{- else if kindOf $val | eq "slice" -}}
    {{- range $elem := $val }}
      {{- list $elem (printf "%s__0" $sublabel) | include "recurseSecretConfig" -}}
    {{- end }}
  {{- else -}}
- name: {{ $sublabel | quote }}
  value: {{ $val | quote }}
{{ end -}}
{{- end -}}
{{- end -}}