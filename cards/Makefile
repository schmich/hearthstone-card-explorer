all: release

publish: release
	ruby publish-dictionary.rb

release: dictionary.json

rel-metadata.json: fetch-rel-metadata.rb
	ruby fetch-rel-metadata.rb

pre-metadata.json: fetch-pre-metadata.rb
	ruby fetch-pre-metadata.rb

pre-image-map.json: download-pre-images.rb
	ruby download-pre-images.rb

card-ids.json: fetch-card-ids.rb
	ruby fetch-card-ids.rb

REL_IMAGES = $(shell find hearthstone-card-images/rel -type f -iname '*.png')
PRE_IMAGES = $(shell find hearthstone-card-images/pre -type f -iname '*.png')

hearthstone-card-images/images.json: $(REL_IMAGES) $(PRE_IMAGES)
	cd hearthstone-card-images && ruby create-images.rb

dictionary.json: card-ids.json rel-metadata.json pre-image-map.json config.json hearthstone-card-images/images.json create-dictionary.rb
	ruby create-dictionary.rb
