import { ISyncTask } from '@core/models/syncTask.model';

export interface ISyncTaskApi extends Omit<ISyncTask, 'sourceConnectorConfig' | 'sinkConnectorConfig'> {}
