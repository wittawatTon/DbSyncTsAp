class PrometheusQueryBuilder {
  private metricName: string = '';
  private labels: Record<string, string> = {};

  metric(name: string): this {
    this.metricName = name;
    return this;
  }

  label(key: string, value: string): this {
    this.labels[key] = value;
    return this;
  }

  labelsBulk(labels: Record<string, string>): this {
    this.labels = { ...this.labels, ...labels };
    return this;
  }

  build(): string {
    if (!this.metricName) throw new Error("Metric name required");

    const labelStr = Object.entries(this.labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');

    return labelStr ? `${this.metricName}{${labelStr}}` : this.metricName;
  }
}
