# -*- coding: utf-8 -*-
"""快照 schema 测试：加载真实快照并断言结构 / 数量 / 一致性。"""
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from crawler.validate import validate_snapshot
from crawler.build_snapshot import norm_room

SNAPSHOT = Path(__file__).resolve().parent.parent / 'public' / 'data' / 'snapshot.json'


@unittest.skipUnless(SNAPSHOT.exists(), 'public/data/snapshot.json 不存在')
class TestSnapshotSchema(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(SNAPSHOT, 'r', encoding='utf-8') as f:
            cls.snap = json.load(f)

    def test_validate_passes(self):
        self.assertEqual(validate_snapshot(self.snap), [])

    def test_counts(self):
        self.assertGreaterEqual(len(self.snap['notices']['items']), 40)
        self.assertGreaterEqual(len(self.snap['news']['items']), 1)
        self.assertGreaterEqual(len(self.snap['calendar']['items']), 10)
        self.assertGreaterEqual(len(self.snap['rows']), 40000)

    def test_course_table_consistency(self):
        ct = self.snap['courseTable']
        self.assertEqual(ct['count'], self.snap['courseTables'][0]['count'])
        rooms = {norm_room(r['r']) for r in self.snap['rows'] if r['r']}
        self.assertEqual(ct['rooms'], len(rooms))

    def test_rows_fields(self):
        for r in self.snap['rows'][:200]:
            for k in ('c', 't', 'cls', 'd', 's', 'e', 'w', 'r', 'term'):
                self.assertIn(k, r)


if __name__ == '__main__':
    unittest.main()