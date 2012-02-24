SRC=./src
BUILD=./build

PROJECT=SmartFilters
VERSION=$(shell cat $(SRC)/BASEVER)
XPI_NAME=$(PROJECT)_$(VERSION).xpi
XPI=$(BUILD)/$(XPI_NAME)

CHROME=chrome
BCHROME=$(BUILD)/$(CHROME)
BCONTENT=$(BCHROME)/content
SRC_CHROMES=$(shell find $(SRC)/$(CHROME) -type f -a -not -name "*~")
BUILD_CHROMES=$(SRC_CHROMES:$(SRC)/$(CHROME)/%=$(BCHROME)/%)

DEFAULTS=defaults
BDEFAULTS=$(BUILD)/$(DEFAULTS)
SRC_DEFAULTS=$(shell find $(SRC)/$(DEFAULTS) -type f -a -not -name "*~")
BUILD_DEFAULTS=$(SRC_DEFAULTS:$(SRC)/$(DEFAULTS)/%=$(BDEFAULTS)/%)

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

$(XPI): $(JAR) $(BRDF) $(BMANIFEST) $(BUILD_DEFAULTS)
	cd $(BUILD) && zip $(XPI_NAME) -r $(MANIFEST) $(RDF) $(CHROME) $(DEFAULTS)

$(BRDF): $(BASEVER) $(RDF_PRE)
	sed -e "s/BASEVER/${VERSION}/g;" $(RDF_PRE) > $(BRDF)

clean:
	rm -rf $(BUILD)
