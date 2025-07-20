import { Client as SSHClient } from 'ssh2';
import { exec } from 'child_process';
import { EventEmitter } from 'events';

export interface SSHConfig {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export type ExecutionMode = 'local' | 'ssh';

export interface BashCommandOptions {
  command: string;
  sshConfig?: SSHConfig; // optional if local
  overrideMode?: ExecutionMode; // optional override
}

export class BashServiceManager extends EventEmitter {
  constructor(private defaultMode: ExecutionMode = 'local') {
    super();
  }

  runCommand(options: BashCommandOptions): Promise<string> {
    const { command, sshConfig, overrideMode } = options;
    const mode = overrideMode || this.defaultMode;

    if (mode === 'local') {
      return this.runLocal(command);
    } else if (mode === 'ssh') {
      if (!sshConfig) throw new Error('SSH config is required for remote execution');
      return this.runSSH(command, sshConfig);
    } else {
      throw new Error(`Unknown execution mode: ${mode}`);
    }
  }

  private runLocal(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, { shell: '/bin/bash' }, (error, stdout, stderr) => {
        if (error) {
          return reject(`❌ Local command failed: ${stderr || error.message}`);
        }
        resolve(stdout.trim());
      });
    });
  }

  private runSSH(command: string, config: SSHConfig): Promise<string> {
    return new Promise((resolve, reject) => {
      const conn = new SSHClient();
      let stdout = '';
      let stderr = '';

      conn
        .on('ready', () => {
          conn.exec(command, (err, stream) => {
            if (err) return reject(err);

            stream
              .on('close', (code, signal) => {
                conn.end();
                if (code !== 0) {
                  return reject(`❌ Remote command failed (code ${code}): ${stderr}`);
                }
                resolve(stdout.trim());
              })
              .on('data', (data: Buffer) => {
                stdout += data.toString();
              })
              .stderr.on('data', (data: Buffer) => {
                stderr += data.toString();
              });
          });
        })
        .on('error', (err) => reject(`❌ SSH connection failed: ${err.message}`))
        .connect({
          host: config.host,
          port: config.port || 22,
          username: config.username,
          password: config.password,
          privateKey: config.privateKey,
        });
    });
  }
}
