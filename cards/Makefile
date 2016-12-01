all: release

upload: release
	ruby upload-repo.rb

release: hearthstone-card-explorer.json

rel-metadata.json: fetch-rel-metadata.rb
	ruby fetch-rel-metadata.rb

pre-metadata.json: fetch-pre-metadata.rb
	ruby fetch-pre-metadata.rb

pre-image-map.json: download-pre-images.rb
	ruby download-pre-images.rb

REL_IMAGES = $(shell find hearthstone-card-images/rel -type f -iname '*.png')
PRE_IMAGES = $(shell find hearthstone-card-images/pre -type f -iname '*.png')

hearthstone-card-images/cdn-map.json: $(REL_IMAGES) $(PRE_IMAGES)
	cd hearthstone-card-images && ruby create-cdn-map.rb

hearthstone-card-explorer.json: rel-metadata.json pre-image-map.json config.json hearthstone-card-images/cdn-map.json create-repo.rb
	ruby create-repo.rb
