# Refreshes _data/tle.json with current TLEs from CelesTrak for every
# satellite in _data/satellites.yml. Run before building:
#
#   ruby scripts/fetch_tle.rb
#
# If a download fails, the previous TLE for that satellite is kept.

require "json"
require "net/http"
require "time"
require "yaml"

ROOT = File.expand_path("..", __dir__)
SATELLITES = File.join(ROOT, "_data", "satellites.yml")
OUTPUT = File.join(ROOT, "_data", "tle.json")

def fetch(catnr)
  uri = URI("https://celestrak.org/NORAD/elements/gp.php?CATNR=#{catnr}&FORMAT=TLE")
  res = Net::HTTP.get_response(uri)
  raise "HTTP #{res.code}" unless res.is_a?(Net::HTTPSuccess)

  lines = res.body.lines.map(&:strip).reject(&:empty?)
  line1 = lines.find { |l| l.start_with?("1 ") }
  line2 = lines.find { |l| l.start_with?("2 ") }
  raise "no TLE in response" unless line1 && line2

  [line1, line2]
end

previous = File.exist?(OUTPUT) ? JSON.parse(File.read(OUTPUT)) : {}
old = (previous["satellites"] || []).to_h { |s| [s["catnr"], s] }

satellites = YAML.load_file(SATELLITES).map do |sat|
  line1, line2 = fetch(sat["catnr"])
  puts "ok    #{sat['name']}"
  { "name" => sat["name"], "catnr" => sat["catnr"], "line1" => line1, "line2" => line2 }
rescue StandardError => e
  kept = old[sat["catnr"]]
  warn "keep  #{sat['name']}: #{e.message}"
  kept
end.compact

abort "no TLEs available" if satellites.empty?

File.write(OUTPUT, JSON.pretty_generate({
  "fetched" => Time.now.utc.iso8601,
  "source" => "CelesTrak",
  "satellites" => satellites
}) + "\n")
puts "wrote #{satellites.size} TLEs to _data/tle.json"
