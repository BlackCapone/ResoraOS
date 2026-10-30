import json, os, sys, tempfile, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'payload', 'usr', 'lib', 'resora'))
import resora_bridge as b


class BridgeTests(unittest.TestCase):
    def test_nmcli_escapes(self):
        self.assertEqual(b.split_nmcli(r'*:Home\:Net:78:WPA2'), ['*', 'Home:Net', '78', 'WPA2'])

    def test_wifi_list_dedupes_and_sorts(self):
        text = ' :Cafe:40:--\n*:Home:70:WPA2\n :Home:55:WPA2\n :Neighbour:90:WPA2\n::30:WPA2\n'
        nets = b.parse_wifi_list(text)
        self.assertEqual([n['ssid'] for n in nets], ['Home', 'Neighbour', 'Cafe'])
        self.assertTrue(nets[0]['active'])
        self.assertFalse(nets[2]['secure'])
        self.assertEqual(nets[0]['signal'], 70)

    def test_volume_and_brightness_parsing(self):
        self.assertEqual(b.parse_wpctl_volume('Volume: 0.60'), {'value': 60, 'muted': False})
        self.assertEqual(b.parse_wpctl_volume('Volume: 0.35 [MUTED]'), {'value': 35, 'muted': True})
        self.assertEqual(b.parse_brightness('intel_backlight,backlight,4800,50%,96000'), 50)
        self.assertIsNone(b.parse_brightness('garbage'))

    def test_battery_reads_sysfs(self):
        with tempfile.TemporaryDirectory() as d:
            bat = os.path.join(d, 'BAT0'); os.makedirs(bat)
            for k, v in (('type', 'Battery'), ('capacity', '64'), ('status', 'Charging')):
                open(os.path.join(bat, k), 'w').write(v + '\n')
            ac = os.path.join(d, 'AC'); os.makedirs(ac); open(os.path.join(ac, 'type'), 'w').write('Mains\n')
            self.assertEqual(b.battery(d), {'percent': 64, 'charging': True})
        with tempfile.TemporaryDirectory() as d:
            self.assertIsNone(b.battery(d))

    def test_fs_list_sorts_dirs_first_and_hides_dotfiles(self):
        with tempfile.TemporaryDirectory() as d:
            os.makedirs(os.path.join(d, 'Zeta')); open(os.path.join(d, 'a.txt'), 'w').write('x'); open(os.path.join(d, '.hidden'), 'w').write('x')
            r = b.fs_list(d)
            self.assertEqual([i['name'] for i in r['items']], ['Zeta', 'a.txt'])
            self.assertTrue(r['items'][0]['dir'])
        with self.assertRaises(NotADirectoryError):
            b.fs_list('/definitely/not/here')

    def test_dispatch_errors_are_reported_not_raised(self):
        self.assertEqual(b.dispatch(json.dumps({'id': 7, 'cmd': 'nope'})), (7, False, 'Неизвестная команда'))
        mid, ok, _ = b.dispatch(json.dumps({'id': 8, 'cmd': 'app.launch', 'args': {'app': 'rm -rf'}}))
        self.assertEqual((mid, ok), (8, False))
        self.assertFalse(b.dispatch('not json')[1])
        mid, ok, data = b.dispatch(json.dumps({'id': 9, 'cmd': 'fs.list', 'args': {'path': '/tmp'}}))
        self.assertTrue(ok and data['path'] == os.path.realpath('/tmp'))

    def test_fs_read_limits_and_decodes(self):
        with tempfile.TemporaryDirectory() as d:
            f = os.path.join(d, 'n.txt')
            with open(f, 'w', encoding='utf-8') as fh:
                fh.write('привет ' * 10)
            r = b.fs_read(f, limit=1000)
            self.assertTrue(r['text'].startswith('привет') and not r['truncated'])
            self.assertTrue(b.fs_read(f, limit=5)['truncated'])
        with self.assertRaises(FileNotFoundError):
            b.fs_read('/nope/file')

    def test_parse_upgradable(self):
        text = ('Listing...\n'
                'libssl3t64/noble-security 3.0.13-0ubuntu3.6 amd64 [upgradable from: 3.0.13-0ubuntu3.5]\n'
                'zlib1g/noble-updates 1:1.3.dfsg-3.1ubuntu2.2 amd64 [upgradable from: 1:1.3.dfsg-3.1ubuntu2.1]\n'
                'resora-shell/stable 1.0.20261105 all [upgradable from: 1.0.20261027]\n')
        pk = b.parse_upgradable(text)
        self.assertEqual([p['name'] for p in pk], ['resora-shell', 'libssl3t64', 'zlib1g'])
        self.assertTrue(pk[0]['resora'] and not pk[0]['security'])
        self.assertTrue(pk[1]['security'])
        self.assertEqual(pk[1]['current'], '3.0.13-0ubuntu3.5')
        self.assertEqual(b.parse_upgradable('Listing... Done\n'), [])

    def test_auto_upgrade_config_detection(self):
        self.assertTrue(b.auto_enabled('APT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "1";\n'))
        self.assertFalse(b.auto_enabled('APT::Periodic::Unattended-Upgrade "0";'))
        self.assertFalse(b.auto_enabled(''))

    def test_update_status_before_any_update(self):
        b._UPDATE['proc'] = None
        st = b.update_status()
        self.assertFalse(st['running'] or st['done'] or st['started'])

    def test_last_check_time_missing_file(self):
        self.assertIsNone(b.last_check_time('/no/such/stamp'))

    def test_external_commands_run_in_c_locale(self):
        code, out, _ = b.run(['sh', '-c', 'echo $LC_ALL'])
        self.assertEqual((code, out.strip()), (0, 'C'))

    def test_timezone_is_validated(self):
        for bad in ('', '../etc', 'Europe/Moscow; reboot', 'x y'):
            with self.assertRaises(ValueError):
                b.set_timezone(bad)


if __name__ == '__main__':
    unittest.main()
