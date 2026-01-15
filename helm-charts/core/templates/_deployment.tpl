{{/* Library template: Deployment */}}
{{- define "tsg-core.deployment" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ template "tsg-core.fullname" . }}
  labels: {{ include "tsg-core.labels" $ | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app.kubernetes.io/name: {{ template "tsg-core.fullname" . }}
      app.kubernetes.io/instance: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app.kubernetes.io/name: {{ template "tsg-core.fullname" . }}
        app.kubernetes.io/instance: {{ .Release.Name }}
      annotations:
        checksum/config: {{ tpl (toYaml .Values.config) . | sha256sum }}
    spec:
      {{- if .Values.serviceAccount.create }}
      serviceAccountName: {{ include "tsg-core.serviceAccountName" . }}
      {{- end }}
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
      containers:
        - name: {{ template "tsg-core.name" . }}
          image: "{{ .Values.image.repository }}:{{ tpl .Values.image.tag . }}"
          imagePullPolicy: Always
          env:
            - name: SUBPATH
              value: {{ template "tsg-core.subPath" . }}
            {{- if .Values.resources.limits.memory }}
            - name: NODE_OPTIONS
              value: {{ include "tsg-core.limitToOldSpace" .Values.resources.limits.memory }}
            {{- end }}
            {{- with concat .Values.env (fromYamlArray (list .Values.configFromSecrets "" | include "tsg-core.recurseSecretConfig"))}}
              {{- toYaml . | nindent 12 }}
            {{- end }}
          resources: {{ .Values.resources | toYaml | nindent 12 }}
          ports:
            - name: http
              containerPort: {{ .Values.config.server.port | default 3000 }}
              protocol: TCP
          livenessProbe:
            httpGet:
              path: /health
              port: {{ .Values.config.server.port | default 3000 }}
          readinessProbe:
            httpGet:
              path: /health
              port: {{ .Values.config.server.port | default 3000 }}
          startupProbe:
            httpGet:
              path: /health
              port: {{ .Values.config.server.port | default 3000 }}
            initialDelaySeconds: 2
            periodSeconds: 2
            failureThreshold: 60
          volumeMounts:
          - name: {{ template "tsg-core.name" . }}-config
            mountPath: "/app/config.yaml"
            subPath: "config.yaml"
          {{- if .Values.persistentVolume}}
          - name: {{ template "tsg-core.name" . }}-pvc
          {{- with .Values.persistentVolume }}
            mountPath: {{ .mountPath }}
            {{- end }}
          {{- end }}
          {{- if .Values.secretMounts }}
          {{- range .Values.secretMounts }}
          - name: {{ .name }}
            mountPath: {{ .mountPath }}
            readOnly: {{ .readOnly | default true }}
          {{- end }}
          {{- end }}
      volumes:
      - name: {{ template "tsg-core.name" . }}-config
        configMap:
          name: {{ template "tsg-core.fullname" . }}-config
      {{- if .Values.persistentVolume }}
      - name: {{ template "tsg-core.name" . }}-pvc
        persistentVolumeClaim:
          claimName: {{ template "tsg-core.fullname" . }}-pvc
      {{- end }}
      {{- if .Values.secretMounts }}
      {{- range .Values.secretMounts }}
      - name: {{ .name }}
        secret:
          secretName: {{ .secretName }}
          {{- if .items }}
          items:
          {{- range .items }}
          - key: {{ .key }}
            path: {{ .path }}
          {{- end }}
          {{- end }}
      {{- end }}
      {{- end }}
{{- end }}
