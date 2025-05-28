import { ISyncTask } from '@core/models/syncTask.model.js';

export interface ISyncTaskApi extends Omit<ISyncTask, 'sourceConnectorConfig' | 'sinkConnectorConfig'> {}
