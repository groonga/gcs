#!/bin/sh

LANG=C

PACKAGE=$(cat /tmp/build-package)
USER_NAME=$(cat /tmp/build-user)
VERSION=$(cat /tmp/build-version)
DEPENDED_PACKAGES=$(cat /tmp/depended-packages)
BUILD_SCRIPT=/tmp/build-deb-in-chroot.sh

run()
{
    "$@"
    if test $? -ne 0; then
	echo "Failed $@"
	exit 1
    fi
}

if [ ! -x /usr/bin/lsb_release ]; then
    run apt-get update
    run apt-get install -y lsb-release
fi

distribution=$(lsb_release --id --short)
code_name=$(lsb_release --codename --short)

security_list=/etc/apt/sources.list.d/security.list
if [ ! -f "${security_list}" ]; then
    case ${distribution} in
	Debian)
	    if [ "${code_name}" = "sid" ]; then
		touch "${security_list}"
	    else
		cat <<EOF > "${security_list}"
deb http://security.debian.org/ ${code_name}/updates main
deb-src http://security.debian.org/ ${code_name}/updates main
EOF
	    fi
	    ;;
	Ubuntu)
	    cat <<EOF > "${security_list}"
deb http://security.ubuntu.com/ubuntu ${code_name}-security main restricted
deb-src http://security.ubuntu.com/ubuntu ${code_name}-security main restricted
EOF
	    ;;
    esac
fi

sources_list=/etc/apt/sources.list
if [ "$distribution" = "Ubuntu" ] && \
    ! (grep '^deb' $sources_list | grep -q universe); then
    run sed -i'' -e 's/main$/main universe/g' $sources_list
fi

groonga_list=/etc/apt/sources.list.d/groonga.list
if [ ! -f "${groonga_list}" ]; then
    case ${distribution} in
	Debian)
	    component=main
	    ;;
	Ubuntu)
	    component=universe
	    ;;
    esac
    downcased_distribtion=$(echo ${distribution} | tr A-Z a-z)
    run cat <<EOF | run tee ${groonga_list}
deb http://packages.groonga.org/${downcased_distribtion}/ ${code_name} ${component}
deb-src http://packages.groonga.org/${downcased_distribtion}/ ${code_name} ${component}
EOF
    apt-get update -V
    run apt-get -V -y --allow-unauthenticated install groonga-keyring
fi

if [ ! -x /usr/bin/aptitude ]; then
    run apt-get update
    run apt-get install -y aptitude
fi
run aptitude update -V -D
run aptitude safe-upgrade -V -D -y

run aptitude install -V -D -y ruby

eval $(dpkg-architecture)
if [ -n "${DEB_HOST_MULTIARCH}" ]; then
    ruby -i'' -pe '$_.gsub!(/\/lib\//, "/lib/*/")' \
	/tmp/${PACKAGE}-debian/*.install
fi

run aptitude install -V -D -y devscripts ${DEPENDED_PACKAGES}
run aptitude clean

if ! id $USER_NAME >/dev/null 2>&1; then
    run useradd -m $USER_NAME
fi

cat <<EOF > $BUILD_SCRIPT
#!/bin/sh

rm -rf build
mkdir -p build

cp /tmp/${PACKAGE}-${VERSION}.tar.gz build/${PACKAGE}_${VERSION}.orig.tar.gz
cd build
tar xfz ${PACKAGE}_${VERSION}.orig.tar.gz
cd ${PACKAGE}-${VERSION}/
cp -rp /tmp/${PACKAGE}-debian debian
# export DEB_BUILD_OPTIONS=noopt
debuild -us -uc
EOF

run chmod +x $BUILD_SCRIPT
run su - $USER_NAME $BUILD_SCRIPT
