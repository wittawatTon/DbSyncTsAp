import { IDebeziumConnectorConfig } from "@core/models/type.js";
import { PipelineWithConnections } from "@core/models/pipeline.model.js";
import { ConnectorType } from "@core/models/type.js";
import { IConnectorBuilder,IConnectorBuildData } from "../IConnectorBuilder.js";


export abstract class ConnectorBuilderBase implements IConnectorBuilder {
  abstract name: string;
  abstract type: ConnectorType;

  abstract build(connectorBuildData: IConnectorBuildData): IDebeziumConnectorConfig;


/**
 * สร้าง SMT config สำหรับ Debezium connector 
 * เพื่อเปลี่ยนชื่อ table และ column ตาม mapping ที่กำหนด
 */
createSmtConfig(pipeline: PipelineWithConnections): { [key: string]: string } {
  const smtConfig: { [key: string]: string } = {};

  const transformNames: string[] = ["RenameTopic", "unwrap"];
  let smtIndex = 0;

  // ✅ Rename topic to just table name
  smtConfig["transforms.RenameTopic.type"] = "org.apache.kafka.connect.transforms.RegexRouter";
  smtConfig["transforms.RenameTopic.regex"] = "([a-zA-Z0-9_]+)\\.([a-zA-Z0-9_]+)\\.(.*)";
  smtConfig["transforms.RenameTopic.replacement"] = "$3";

  // ✅ Unwrap Debezium payload
  smtConfig["transforms.unwrap.type"] = "io.debezium.transforms.ExtractNewRecordState";
  smtConfig["transforms.unwrap.drop.tombstones"] = "false";
  smtConfig["transforms.unwrap.delete.handling.mode"] = "rewrite";
  smtConfig["transforms.unwrap.add.fields"] = "op,table";

  pipeline.targetTables.forEach((table) => {
    if (!table.isSelected) return;

    const topicName = table.name;

    // ✅ Rename table (topic)
    if (table.sourceTableName && table.sourceTableName !== table.name) {
      const renameName = `renameTable${smtIndex}`;
      smtConfig[`transforms.${renameName}.type`] = "org.apache.kafka.connect.transforms.RegexRouter";
      smtConfig[`transforms.${renameName}.regex`] = `(${table.sourceTableName})`;
      smtConfig[`transforms.${renameName}.replacement`] = table.name;
      transformNames.push(renameName);
      smtIndex++;
    }

    // ✅ Check if column renaming is needed
    const columnRenames = table.columnMappings
      .filter((m) => m.sourceColumn !== m.targetColumn)
      .map((m) => `${m.sourceColumn}:${m.targetColumn}`);

    if (columnRenames.length > 0) {
      const replaceName = `replaceFields${smtIndex}`;
      const predicateName = `isTopic${smtIndex}`;

      // 🧠 Predicate to match current topic
      smtConfig[`predicates.${predicateName}.type`] = "org.apache.kafka.connect.transforms.predicates.TopicNameMatches";
      smtConfig[`predicates.${predicateName}.pattern`] = topicName;

      // 🔄 ReplaceField$Value only for this topic
      smtConfig[`transforms.${replaceName}.type`] = "org.apache.kafka.connect.transforms.ReplaceField$Value";
      smtConfig[`transforms.${replaceName}.renames`] = columnRenames.join(",");
      smtConfig[`transforms.${replaceName}.predicate`] = predicateName;

      transformNames.push(replaceName);
      smtIndex++;
    }
  });

  smtConfig["transforms"] = transformNames.join(",");

  return smtConfig;
}



}

