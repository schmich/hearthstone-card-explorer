require 'json'
require 'json/stream'
require 'uri'
require 'set'
require 'pp'
require 'set'

dup_alias_parser = JSON::Stream::Parser.new do
  aliases = Set.new
  phase = 0
  depth = 0

  start_object {
    if phase == 1
      phase = 2
      depth = 1
    elsif phase == 2
      depth += 1
    end
  }

  end_object {
    if phase == 2
      depth -= 1
    end
  }

  key { |name|
    if phase == 0 && name == 'aliases'
      phase = 1
    elsif phase == 2 && depth == 1
      if !aliases.add?(name)
        raise "Duplicate alias: #{name}."
      end
    end
  }
end

dup_alias_parser << File.read('config.json')

def create_card_ids
  cards = JSON.parse(File.read('card-ids.json'))

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

dict = {
  'cards' => {},
  'aliases' => {},
  'explicit' => {}
}

card_ids = create_card_ids
prerelease_image_map = JSON.parse(File.read('pre-image-map.json'))
release_image_map = Hash[
  card_ids.map { |name, id|
    [name, File.join('rel', "#{id}.png")]
  }
]

puts 'Build dictionary.'

config = JSON.parse(File.read('config.json'))
aliases = config['aliases']
aliases.each do |alias_name, real_name|
  if alias_name =~ /[A-Z]/
    raise "Alias '#{alias_name}' has uppercase characters."
  end

  if !card_ids.include?(real_name)
    raise "Alias '#{alias_name}' refers to missing card: '#{real_name}'."
  end
end

explicit = config['explicit']
explicit.each do |name|
  if !card_ids.include?(name) && !aliases.keys.map(&:downcase).include?(name.downcase)
    raise "Exclusion '#{name}' does not match any card or alias."
  end
end

dict['aliases'] = aliases
dict['explicit'] = explicit

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

cdn_map = JSON.parse(File.read(File.join('hearthstone-card-images', 'map.json')))
cdn_map = Hash[cdn_map.map { |entry| [entry['id'], entry['path']] }]

cards.each do |card|
  name = card['name']
  next if ['hero power', 'hero'].include?(card['type'])

  id = card_ids[name]
  image = cdn_map[id]
  if !image
    raise "Could not find image for #{name} (#{id})."
  end

  dict['cards'][name] = image
end

open('dictionary.json', 'w') do |w|
  w.write(JSON.dump(dict))
end

puts 'Finished.'
