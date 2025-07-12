@echo off
set source=Z:
set destination=E:\WNR\projects\dbRep\DbSyncTsApi\src\config

echo Copying files from %source% to %destination% ...
robocopy  "%source%" "%destination%"  /XO /FFT /R:2 /W:2



set source=Z:\jmx-exporter
set destination=E:\WNR\projects\dbRep\DbSyncTsApi\src\config\jmx-exporter

echo Copying files from %source% to %destination% ...
robocopy  "%source%" "%destination%"  /XO /FFT /R:2 /W:2



set source=Z:\OpenLogReplicator\build\scripts
set destination=E:\WNR\projects\dbRep\DbSyncTsApi\src\config\OpenLogReplicator\build\scripts

echo Copying files from %source% to %destination% ...
robocopy  "%source%" "%destination%"  /XO /FFT /R:2 /W:2

set source=C:\Users\witta\AppData\Roaming\DBeaverData\workspace6\General\Scripts
set destination=E:\WNR\projects\dbRep\DbSyncTsApi\src\config\Sql

echo Copying files from %source% to %destination% ...
robocopy  "%source%" "%destination%"  /XO /FFT /R:2 /W:2


set source=E:\WNR\projects\dbRep
set destination=E:\WNR\projects\dbRep\DbSyncTsApi\src\config\manual

echo Copying files from %source% to %destination% ...
robocopy  "%source%" "%destination%"  /XO /FFT /R:2 /W:2

set source=E:\WNR\projects\dbRep\debezium-cdc
set destination=E:\WNR\projects\dbRep\DbSyncTsApi\src\config\manual

echo Copying files from %source% to %destination% ...
robocopy  "%source%" "%destination%"  /XO /FFT /R:2 /W:2


echo Done!





pause
