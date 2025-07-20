import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { PipelineWithConnections } from "@core/models/pipeline.model.js";
import { ConnectorType } from "@core/models/type.js";
import { IConnectorBuilder,IConnectorBuildData } from "../IConnectorBuilder.js";


export abstract class ConnectorBuilderBase implements IConnectorBuilder {
  abstract name: string;
  abstract type: ConnectorType;

  abstract build(connectorBuildData: IConnectorBuildData): IDebeziumConnectorConfig;


  getConnectorTableConfig(
    pipeline: PipelineWithConnections,
    schema: string
  ): { [key: string]: string } {
      const selectedTables = pipeline.sourceTables
      .filter((t) => t.isSelected)
      .map((t) => `${schema}.${t.name}`);
      return {
        "table.include.list": selectedTables.join(","),
      } 
  }
  getConnectorColumnConfig(
    pipeline: PipelineWithConnections,
    schema: string
  ): { [key: string]: string } {
    const selectedTables = pipeline.sourceTables.filter((table) => table.isSelected);

    const includedColumns = selectedTables.flatMap((table) =>
      table.columns
        .filter((column) => column.isSelected)
        .map((column) => `${schema}.${table.name}.${column.name}`)
    );

    const excludedColumns = selectedTables.flatMap((table) =>
      table.columns
        .filter((column) => !column.isSelected)
        .map((column) => `${schema}.${table.name}.${column.name}`)
    );

    if (includedColumns.length >= excludedColumns.length) {
      return {
        "column.exclude.list": excludedColumns.join(","),
      };
    } else {
      return {
        "column.include.list": includedColumns.join(","),
      };
    }
  }


}

