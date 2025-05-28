import { ReplicationStatus } from '@core/models/syncTask.model.js';

export interface ConnectorStatus {
  state: string;
}

export interface TaskStatus {
  state: string;
}

export interface ReplicationStatusObject {
  connector?: ConnectorStatus;
  tasks?: TaskStatus[];
}

/**
 * Summarize the replication status based on connector and task states.
 * @param status - The replication status object.
 * @returns ReplicationStatus
 */
export function summarizeReplicationStatus(status: ReplicationStatusObject): ReplicationStatus {
  const connectorState = status.connector?.state;
  const taskStates = (status.tasks || []).map(task => task.state);

  if (connectorState === 'FAILED') {
    return 'error';
  }

  if (connectorState === 'UNASSIGNED' || connectorState === 'INITIALIZING') {
    return 'onProgress';
  }

  if (connectorState === 'PAUSED') {
    return 'warning';
  }

  if (taskStates.length === 0 || taskStates.every(s => s === 'UNASSIGNED')) {
    return 'onProgress';
  }

  if (taskStates.every(s => s === 'RUNNING') && connectorState === 'RUNNING') {
    return 'success';
  }

  if (taskStates.some(s => s === 'FAILED' || s === 'UNASSIGNED')) {
    return 'warning';
  }

  return 'warning'; // fallback
}

/**
 * Combine source and sink status into one connection status.
 * @param sourceStatus - One of 'success', 'warning', 'error', 'onProgress'
 * @param sinkStatus - One of 'success', 'warning', 'error', 'onProgress'
 * @returns Combined ReplicationStatus
 */
export function getCombinedConnectionStatus(
  sourceStatus: ReplicationStatus,
  sinkStatus: ReplicationStatus
): ReplicationStatus {
  const priority: ReplicationStatus[] = ['error', 'warning', 'onProgress', 'success'];

  const combined = [sourceStatus, sinkStatus];
  for (const level of priority) {
    if (combined.includes(level)) return level;
  }
  return 'onProgress'; // fallback
}