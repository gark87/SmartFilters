SRC=./src
BUILD=./build

PROJECT=SmartFilters
VERSION=$(shell cat $(SRC)/BASEVER)
XPI=$(BUILD)/$(PROJECT)-$(VERSION).xpi

CHROME=chrome
BCHROME=$(BUILD)/$(CHROME)
BCONTENT=$(BCHROME)/content
SRC_CHROMES=$(shell find $(SRC)/$(CHROME) -name "*.js" -o -name "*.xul" -o -name "*.dtd")
BUILD_CHROMES=$(SRC_CHROMES:$(SRC)/%=$(BUILD)/%)

MANIFEST=chrome.manifest
SMANIFEST=$(SRC)/$(MANIFEST)
BMANIFEST=$(BUILD)/$(MANIFEST)

RDF=install.rdf
BRDF=$(BUILD)/$(RDF)
RDF_PRE=$(SRC)/$(RDF).pre

JAR=$(BCHROME)/$(CHROME).jar

DISPMUA=dispmua
SDISPMUA=$(SRC)/$(DISPMUA)
DISPMUA_DATA=$(BCONTENT)/dispmua-data.js
PROCESS_DISPMUA=$(SDISPMUA)/process.pl
SRC_DISPMUA=$(shell find $(SDISPMUA) -type f -name "data-*.js")

all: $(BUILD) $(XPI)

$(BMANIFEST): $(SMANIFEST)
	cp $(SMANIFEST) $(BMANIFEST)

$(BUILD)/%: $(SRC)/%
	cd $(SRC) && cp --parents $* ../$(BUILD)/

$(DISPMUA_DATA): $(PROCESS_DISPMUA) $(SRC_DISPMUA)
	$(PROCESS_DISPMUA) $(SRC_DISPMUA) > $@

$(JAR): $(BUILD_CHROMES) $(DISPMUA_DATA)
	cd $(BCHROME) && zip $(CHROME).jar -r *

$(BUILD):
	mkdir $(BUILD)

$(XPI): $(JAR) $(BRDF) $(BMANIFEST)
	cd $(BUILD) && zip $(PROJECT)-${VERSION}.xpi -r $(MANIFEST) $(RDF) $(CHROME)

clean:
	rm -rf $(BUILD)

$(BRDF): $(BASEVER) $(RDF_PRE)
	sed -e "s/BASEVER/${VERSION}/g;" $(RDF_PRE) > $(BRDF)
