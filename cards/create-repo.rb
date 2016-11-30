require 'json'
require 'open-uri'
require 'uri'
require 'set'
require 'pp'
require 'set'

def fetch_card_ids
  puts 'Fetching card IDs.'

  json = open('https://api.hearthstonejson.com/v1/latest/enUS/cards.json').read
  cards = JSON.parse(json)

  ids = {}
  cards.each do |card|
    name = card['name']
    if card['collectible']
      ids[name] = card['id']
    elsif ids[name].nil?
      ids[name] = card['id']
    end
  end

  return ids
end

repo = {
  'cards' => {},
  'aliases' => {}
}

card_ids = fetch_card_ids
prerelease_image_map = JSON.parse(File.read('pre-image-map.json'))
release_image_map = Hash[
  card_ids.map { |name, id|
    [name, File.join('rel', "#{id}.png")]
  }
]

config = JSON.parse(File.read('config.json'))
aliases = config['aliases']
aliases.each do |alias_name, real_name|
  if !card_ids.include?(real_name)
    raise "Alias '#{alias_name}' refers to missing card: '#{real_name}'."
  end
end

repo['aliases'] = aliases

# There can be multiple cards with the same name.
# Since we can't distinguish the duplicates, we only
# take one version of each card name, prioritizing
# collectible cards first.
cards = JSON.parse(File.read('rel-metadata.json'))
cards = Hash[
  cards.map { |card|
    [card['name'], card]
  }.sort_by { |_, card|
    card['collectible'] ? 1 : 0
  }
].values

cdn_map = JSON.parse(File.read(File.join('hearthstone-card-images', 'cdn-map.json')))
cdn_map = Hash[cdn_map.map { |entry| [entry['id'], entry['path']] }]

excluded_cards = Set.new(config['exclude'])

cards.each do |card|
  name = card['name']
  next if excluded_cards.include?(name)

  id = card_ids[name]
  image = cdn_map[id]
  if !image
    raise "Could not find image for #{name} (#{id})."
  end

  repo['cards'][name] = image
end

open('hearthstone-card-explorer.json', 'w') do |w|
  w.write(JSON.dump(repo))
end

puts 'Finished.'
