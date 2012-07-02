REPOSITORIES_PATH = repositories
DISTRIBUTIONS = fedora centos
ARCHITECTURES = i386 x86_64
PACKAGES = nodejs-msgpack2 nodejs-nroonga
CHROOT_BASE = /var/lib/chroot
RSYNC_PATH = packages@packages.groonga.org:public
HAVE_DEVELOPMENT_BRANCH = no
USE_RPMFORGE = no
USE_ATRPMS = no
GPG_UID = 45499429
BASE_URL_PREFIX = http://packages.groonga.org

release: download build sign update upload

sign:
	./sign-rpm.sh '$(GPG_UID)' '$(REPOSITORIES_PATH)/' \
	  '$(DISTRIBUTIONS)'

update:
	./update-repository.sh '$(PACKAGE)' '$(REPOSITORIES_PATH)/' \
	  '$(DISTRIBUTIONS)'

upload:
	for distribution in $(DISTRIBUTIONS); do		\
	  rsync -avz --progress --delete --exclude .gitignore	\
	    $(REPOSITORIES_PATH)/$${distribution}/		\
	      $(RSYNC_PATH)/$${distribution};			\
	done

download:
	mkdir -p $(REPOSITORIES_PATH)
	for distribution in $(DISTRIBUTIONS); do	\
	   rsync -avz --progress --delete		\
	     $(RSYNC_PATH)/$${distribution}/		\
	     $(REPOSITORIES_PATH)/$${distribution};	\
	done

build: build-in-chroot

build-in-chroot:
	for package in $(PACKAGES); do		\
	  ./build-in-chroot.sh			\
	    $${package}				\
	    $$(cat $${package}-version)		\
	    $${package}				\
	    ../rpm				\
	    $(REPOSITORIES_PATH)/		\
	    $(CHROOT_BASE)			\
	    '$(ARCHITECTURES)'			\
	    '$(DISTRIBUTIONS)'			\
	    '$(HAVE_DEVELOPMENT_BRANCH)'	\
	    '$(USE_RPMFORGE)'			\
	    '$(USE_ATRPMS)';			\
	done
