{{/*
Expand the name of the chart.
*/}}
{{- define "tsg-core.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "tsg-core.fullname" -}}
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
{{- define "tsg-core.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "tsg-core.labels" -}}
helm.sh/chart: {{ include "tsg-core.chart" . }}
{{ include "tsg-core.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "tsg-core.selectorLabels" -}}
app.kubernetes.io/name: {{ include "tsg-core.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "tsg-core.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "tsg-core.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{- define "tsg-core.subPath" -}}
{{- printf "/%s" (trimPrefix "/" .Values.subPath) | trimSuffix "/"}}
{{- end }}

{{- define "tsg-core.recurseSecretConfig" -}}
{{- $map := first . -}}
{{- $label := last . -}}
{{- range $key, $val := $map -}}
  {{- $sublabel := snakecase $key | upper -}}
  {{- if not (empty $label) -}}
    {{- $sublabel = printf "TSG__%s__%s" $label $sublabel -}}
  {{- end -}}
  {{- if kindOf $val | eq "map" -}}
    {{- if and (hasKey $val "name") (hasKey $val "key")}}
- name: {{ $sublabel | quote }}
  valueFrom:
    secretKeyRef:
      name: {{ $val.name }}
      key: {{ $val.key }}
    {{- else }}
    {{- list $val $sublabel | include "tsg-core.recurseSecretConfig" -}}
    {{- end }}
  {{- else if kindOf $val | eq "slice" -}}
    {{- range $idx, $elem := $val }}
      {{- list $elem (printf "%s__%d" $sublabel $idx) | include "tsg-core.recurseSecretConfig" -}}
    {{- end }}
  {{- else -}}
- name: {{ $sublabel | quote }}
  value: {{ $val | quote }}
{{ end -}}
{{- end -}}
{{- end -}}

{{/*
Convert a Kubernetes memory quantity (e.g. 512Mi, 1Gi, 750M, 102400K, 1073741824, 1G, 1Ti) to a (rounded up) integer number of megabytes.

Supported suffixes (case-insensitive):
  (none)/B => bytes
  K, M, G  => decimal SI (powers of 1000)
  Ki, Mi, Gi => binary SI (powers of 1024)

Usage examples:
  {{ include "tsg-core.memoryToMegabytes" "512Mi" }}             => 512
  {{ include "tsg-core.memoryToMegabytes" "1Gi" }}               => 1024
  {{ include "tsg-core.memoryToMegabytes" "1500M" }}             => 1464
  {{ include "tsg-core.memoryToMegabytes" (default "0" .Values.resources.limits.memory) }}

If an invalid quantity is supplied the template will fail with an error.
*/}}
{{- define "tsg-core.memoryToMegabytes" -}}
{{- $q := (printf "%v" .) | trim -}}
{{- if eq $q "" -}}{{- fail "memoryToMegabytes: empty quantity" -}}{{- end -}}
{{- $numPart := regexFind "^[0-9]+\\.?[0-9]*" $q -}}
{{- if not $numPart -}}{{- fail (printf "memoryToMegabytes: invalid quantity: %s" $q) -}}{{- end -}}
{{- $suffix := regexReplaceAll "^[0-9]+\\.?[0-9]*" $q "" | upper -}}
{{- $value := float64 $numPart -}}
{{- /* Determine bytes multiplier */ -}}
{{- $bytesMult := 1 -}}
{{- if or (eq $suffix "") (eq $suffix "B") -}}
  {{- $bytesMult = 1 -}}
{{- else if eq $suffix "K" -}}
  {{- $bytesMult = 1000 -}}
{{- else if eq $suffix "M" -}}
  {{- $bytesMult = 1000000 -}}
{{- else if eq $suffix "G" -}}
  {{- $bytesMult = 1000000000 -}}
{{- else if eq $suffix "KI" -}}
  {{- $bytesMult = 1024 -}}
{{- else if eq $suffix "MI" -}}
  {{- $bytesMult = 1048576 -}}
{{- else if eq $suffix "GI" -}}
  {{- $bytesMult = 1073741824 -}}
{{- else -}}
  {{- fail (printf "memoryToMegabytes: unknown suffix '%s' in quantity '%s'" $suffix $q) -}}
{{- end -}}
{{- /* Convert to bytes (as float) then to MB (decimal) */ -}}
{{- $bytes := mul $value (float64 $bytesMult) -}}
{{- $mbFloat := div $bytes 1048576 -}}
{{- /* Round up to ensure sufficient capacity */ -}}
{{- $mb := floor $mbFloat -}}
{{- $mb -}}
{{- end -}}


{{/*
Calculates and formats the Node.js --max-old-space-size flag based on available memory.
Takes the memory limit value, converts it to megabytes, applies a 90% ratio for old space,

Usage: {{ include "tsg-core.limitToOldSpace" .Values.resources.limits.memory }}
Returns: --max-old-space-size=<calculated_value>
*/}}
{{- define "tsg-core.limitToOldSpace" }}
{{- $mb := include "tsg-core.memoryToMegabytes" . -}}
{{- $old_space := $mb | mulf 0.9 | floor -}}
{{- printf "--max-old-space-size=%v" $old_space -}}
{{- end -}}