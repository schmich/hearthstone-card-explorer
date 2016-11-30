require 'json'
require 'nokogiri'
require 'open-uri'
require 'uri'

def parse_properties(details_elem)
  properties = details_elem.css('li').map { |li| li.inner_text.strip.downcase }
  return Hash[
    properties.map { |property|
      if property =~ /(.*):(.*)/
        [$1.strip, $2.strip]
      else
        [property, true]
      end
    }
  ]
end

def create_card(row)
  img = row.css('.visual-image-cell img').first
  details = row.css('.visual-details-cell').first
  return nil if !img || !details

  name = details.css('h3 a').inner_text.strip
  src = img['src'].strip
  return nil if src.empty? || name.empty?

  properties = parse_properties(details)

  return {
    name: name,
    image: src,
    type: properties['type'],
    rarity: properties['rarity'],
    set: properties['set'],
    collectible: properties['collectible'] || false
  }
end

def scrape(url)
  loop do
    puts "Process #{url}."
    doc = Nokogiri::HTML(open(url))

    rows = doc.css('#cards tr')
    rows.each do |row|
      card = create_card(row)
      yield card if card
    end

    next_link = doc.css('a[rel="next"]').first
    return if !next_link

    next_href = next_link['href']
    url = URI.join(url, next_href).to_s

    puts "Wait before processing next page."
    sleep 2
  end
end

cards = []
url = 'http://www.hearthpwn.com/cards?display=2&filter-unreleased=1&filter-set=108'
scrape(url) do |card|
  cards << card
end

open('pre-metadata.json', 'w') do |w|
  w.write(JSON.dump(cards))
end

puts 'Finished.'
