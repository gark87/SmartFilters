MANIFEST=chrome.manifest
RDF=install.rdf
CHROME=chrome
JAR=chrome.jar
JAR_DIRS=content locale skin
DEFAULTS=defaults
PROJECT=SmartFilters
XPI=.xpi
VERSION=`cat BASEVER`

all: build 

build: jar $(RDF)
	zip $(PROJECT)-${VERSION}$(XPI) -r $(MANIFEST) $(RDF) $(CHROME)/$(JAR) $(DEFAULTS)

jar:
	cd $(CHROME) && zip $(JAR) -r $(JAR_DIRS)

clean:
	rm -f $(CHROME)/$(JAR)
	rm -f $(PROJECT)-*$(XPI)
	rm -f $(RDF)

$(RDF): BASEVER $(RDF).pre
	sed -e "s/BASEVER/${VERSION}/g;" $(RDF).pre > $(RDF)
