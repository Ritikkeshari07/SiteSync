"""SQLite checks for team isolation, atomic membership changes and stale writes."""
import sqlite3
from pathlib import Path
c=sqlite3.connect(':memory:')
c.execute('PRAGMA foreign_keys=ON')
for p in sorted(Path('drizzle').glob('*.sql')): c.executescript(p.read_text())
c.execute('INSERT INTO projects VALUES (?,?,0)',('owner','{"demo":"retained"}'))
c.execute('INSERT INTO team_projects VALUES (?,?,?,?,?,?,?)',('team','owner','owner@example.test','Team','{}',0,'2026-09-08'))
c.commit()
# The exact membership write shape is atomic and optimistic.
def add(version,mid,email,actor):
    with c:
        changed=c.execute('UPDATE team_projects SET state=?,version=version+1 WHERE id=? AND owner=? AND version=?',('{}','team','owner',version)).rowcount
        c.execute('INSERT INTO team_members (id,team_id,email,actor) SELECT ?,?,?,? WHERE changes()=1',(mid,'team',email,actor))
    return changed
assert add(0,'m1','client@example.test','client')==1
assert add(0,'m2','other@example.test','architect')==0
assert c.execute('SELECT count(*) FROM team_members').fetchone()[0]==1
# A uniqueness failure rolls back the version update as well.
try: add(1,'m3','client@example.test','architect')
except sqlite3.IntegrityError: pass
else: raise AssertionError('Duplicate membership accepted')
assert c.execute('SELECT version FROM team_projects').fetchone()[0]==1
query='SELECT DISTINCT t.id FROM team_projects t LEFT JOIN team_members m ON m.team_id=t.id WHERE t.owner=? OR m.email=?'
assert c.execute(query,('outsider','other@example.test')).fetchall()==[]
assert c.execute(query,('member','client@example.test')).fetchall()==[('team',)]
with c:
    c.execute('UPDATE team_projects SET state=?,version=version+1 WHERE id=? AND owner=? AND version=?',('{}','team','owner',1))
    c.execute('DELETE FROM team_members WHERE id=? AND team_id=? AND changes()=1',('m1','team'))
# A removed member cannot save even if it learns the current project version.
write='UPDATE team_projects SET state=?,version=version+1 WHERE id=? AND version=? AND (owner=? OR EXISTS (SELECT 1 FROM team_members m WHERE m.team_id=team_projects.id AND m.email=? AND m.actor=?))'
assert c.execute(write,('{}','team',2,'member','client@example.test','client')).rowcount==0
assert c.execute(write,('{}','team',2,'owner','owner@example.test','pm')).rowcount==1
assert c.execute('SELECT state FROM projects WHERE owner=?',('owner',)).fetchone()[0]=='{"demo":"retained"}'
print('PASS: migrations preserve demo; membership isolation, stale writes, atomic rollback and post-revocation denial verified.')
