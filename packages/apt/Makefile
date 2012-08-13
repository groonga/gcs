REPOSITORIES_PATH = repositories
DISTRIBUTIONS = debian ubuntu
CHROOT_BASE = /var/lib/chroot
ARCHITECTURES = i386 amd64
CODES = squeeze wheezy unstable lucid oneiric precise

PACKAGE = gcs
VERSION = $(shell ruby -rjson -e 'print JSON.parse(ARGF.read)["version"]' ../../package.json)
RSYNC_PATH = packages@packages.groonga.org:public
GPG_UID = 45499429

srcdir = .

all:

release: download build sign-packages update-repository sign-repository upload

download:
	for distribution in $(DISTRIBUTIONS); do	\
	  rsync -avz --progress --delete		\
	    $(RSYNC_PATH)/$${distribution}		\
	    ${REPOSITORIES_PATH}/;			\
	done

sign-packages: ensure-public-key
	./sign-packages.sh '$(GPG_UID)' '$(REPOSITORIES_PATH)/' '$(CODES)'

update-repository:
	./update-repository.sh '$(PACKAGE_NAME)' '$(REPOSITORIES_PATH)/' \
	  '$(ARCHITECTURES)' '$(CODES)'

sign-repository: ensure-public-key
	./sign-repository.sh '$(GPG_UID)' '$(REPOSITORIES_PATH)/' '$(CODES)'

upload:
	for distribution in $(DISTRIBUTIONS); do		\
	  (cd $(REPOSITORIES_PATH)/$${distribution};		\
	   rsync -avz --progress --delete			\
	     dists pool $(RSYNC_PATH)/$${distribution});	\
	done

build: build-package-deb

build-package-deb: source
	./build-in-chroot.sh						\
	  $(PACKAGE) $(VERSION) $(srcdir)/.. $(REPOSITORIES_PATH)/	\
	  $(CHROOT_BASE) '$(ARCHITECTURES)' '$(CODES)'

source: ../$(PACKAGE)-$(VERSION).tar.gz

../$(PACKAGE)-$(VERSION).tar.gz:
	rm -rf $(PACKAGE)-$(VERSION)
	mkdir -p $(PACKAGE)-$(VERSION)
	cp -a ../../.npmignore $(PACKAGE)-$(VERSION)
	cp -a ../../MIT-LICENSE $(PACKAGE)-$(VERSION)
	cp -a ../../README.md $(PACKAGE)-$(VERSION)
	cp -a ../../bin/ $(PACKAGE)-$(VERSION)
	cp -a ../../client_templates/ $(PACKAGE)-$(VERSION)
	cp -a ../../examples/ $(PACKAGE)-$(VERSION)
	cp -a ../../lib/ $(PACKAGE)-$(VERSION)
	cp -a ../../npm-shrinkwrap.json $(PACKAGE)-$(VERSION)
	cp -a ../../package.json $(PACKAGE)-$(VERSION)
	cp -a ../../test/ $(PACKAGE)-$(VERSION)
	cp -a ../../tools/ $(PACKAGE)-$(VERSION)
	cp -a ../../views/ $(PACKAGE)-$(VERSION)
	tar cvzf ../$(PACKAGE)-$(VERSION).tar.gz $(PACKAGE)-$(VERSION)
	rm -rf $(PACKAGE)-$(VERSION)

ensure-public-key:
	gpg --list-keys '$(GPG_UID)' > /dev/null ||			\
	  gpg --keyserver keyserver.ubuntu.com --recv-key '$(GPG_UID)'
