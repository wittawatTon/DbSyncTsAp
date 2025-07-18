SELECT s.sid, s.serial#, s.username, s.program, s.status, l.type, l.id1, l.id2, l.lmode
FROM v$session s
LEFT JOIN v$lock l ON s.sid = l.sid
WHERE s.username = 'C##TESTCDC';  -- หรือ user ที่เชื่อมต่อ


SELECT sql_id, elapsed_time, cpu_time, executions, sql_text
FROM v$sql
WHERE sql_text LIKE '%C##TESTCDC.TEST%'
ORDER BY elapsed_time DESC
FETCH FIRST 10 ROWS ONLY;

SELECT count(*) FROM TEST t ; 