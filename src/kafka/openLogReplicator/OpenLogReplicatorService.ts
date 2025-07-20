import { BashServiceManager, ExecutionMode, SSHConfig } from '@core/services/Bash/BaseServiceManager.js';
import fs from 'fs/promises';


export class OpenLogReplicatorService {
  private manager: BashServiceManager;
  private serviceName = process.env.SERVICE_NAME || 'openlogreplicator';

  private mode: ExecutionMode = (process.env.MODE as ExecutionMode) || 'local';

  private sshConfig: SSHConfig = {
    host: process.env.SSH_HOST!,
    port: process.env.SSH_PORT ? parseInt(process.env.SSH_PORT) : 22,
    username: process.env.SSH_USER!,
    password: process.env.SSH_PASSWORD,
    privateKey: process.env.SSH_PRIVATE_KEY,
  };

  private configPath = '/home/wnr/kafka-cdc-stack/OpenLogReplicator/build/scripts/OpenLogReplicator.json';

  constructor() {
    this.manager = new BashServiceManager(this.mode);
  }

  private async run(cmd: string): Promise<string> {
    return this.manager.runCommand({
      command: cmd,
      sshConfig: this.mode === 'ssh' ? this.sshConfig : undefined,
    });
  }

  start() {
    return this.run(`systemctl start ${this.serviceName}`);
  }

  stop() {
    return this.run(`systemctl stop ${this.serviceName}`);
  }

  restart() {
    return this.run(`systemctl restart ${this.serviceName}`);
  }

  status() {
    return this.run(`systemctl status ${this.serviceName}`);
  }

  logs(lines = 30) {
    return this.run(`journalctl -u ${this.serviceName} -n ${lines} --no-pager`);
  }

  async updateConfig(config: any) {
    await this.stop();

    const json = JSON.stringify(config, null, 2);

    if (this.mode === 'local') {
      await fs.writeFile(this.configPath, json, 'utf-8');
    } else {
      const tmpPath = `/tmp/OpenLogReplicator.json`;
      const writeCmd = `echo '${json.replace(/'/g, `'\\''`)}' > ${tmpPath} && mv ${tmpPath} ${this.configPath}`;
      await this.run(writeCmd);
    }
  }
}
