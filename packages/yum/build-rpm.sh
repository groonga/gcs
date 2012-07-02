#!/bin/sh

LANG=C

PACKAGE=$(cat /tmp/build-package)
VERSION=$(cat /tmp/build-version)
SOURCE_BASE_NAME=$(cat /tmp/build-source-base-name)
USER_NAME=$(cat /tmp/build-user)
DEPENDED_PACKAGES=$(cat /tmp/depended-packages)
USE_RPMFORGE=$(cat /tmp/build-use-rpmforge)
USE_ATRPMS=$(cat /tmp/build-use-atrpms)
BUILD_OPTIONS=$(cat /tmp/build-options)
BUILD_SCRIPT=/tmp/build-${PACKAGE}.sh

run()
{
    "$@"
    if test $? -ne 0; then
	echo "Failed $@"
	exit 1
    fi
}

if ! id $USER_NAME >/dev/null 2>&1; then
    run useradd -m $USER_NAME
fi

yum_options=

distribution=$(cut -d ' ' -f 1 /etc/redhat-release | tr 'A-Z' 'a-z')
if grep -q Linux /etc/redhat-release; then
    distribution_version=$(cut -d ' ' -f 4 /etc/redhat-release)
else
    distribution_version=$(cut -d ' ' -f 3 /etc/redhat-release)
fi
if ! rpm -q ${distribution}-release > /dev/null 2>&1; then
    packages_dir=/var/cache/yum/core/packages
    release_rpm=${distribution}-release-${distribution_version}-*.rpm
    run rpm -Uvh --force ${packages_dir}/${release_rpm}
    run rpm -Uvh --force ${packages_dir}/ca-certificates-*.rpm
fi

if test "$USE_RPMFORGE" = "yes"; then
    if ! rpm -q rpmforge-release > /dev/null 2>&1; then
	architecture=$(cut -d '-' -f 1 /etc/rpm/platform)
	rpmforge_url=http://packages.sw.be/rpmforge-release
	rpmforge_rpm_base=rpmforge-release-0.5.2-2.el5.rf.${architecture}.rpm
	wget $rpmforge_url/$rpmforge_rpm_base
	run rpm -Uvh $rpmforge_rpm_base
	rm $rpmforge_rpm_base
	sed -i'' -e 's/enabled = 1/enabled = 0/g' /etc/yum.repos.d/rpmforge.repo
    fi
    yum_options="$yum_options --enablerepo=rpmforge"
fi

if test "$USE_ATRPMS" = "yes"; then
    case "$(cat /etc/redhat-release)" in
	CentOS*)
	    repository_label=CentOS
	    repository_prefix=el
	    ;;
	*)
	    repository_label=Fedora
	    repository_prefix=f
	    ;;
    esac
    cat <<EOF > /etc/yum.repos.d/atrpms.repo
[atrpms]
name=${repository_label} \$releasever - \$basearch - ATrpms
baseurl=http://dl.atrpms.net/${repository_prefix}\$releasever-\$basearch/atrpms/stable
gpgkey=http://ATrpms.net/RPM-GPG-KEY.atrpms
gpgcheck=1
enabled=0
EOF
    yum_options="$yum_options --enablerepo=atrpms"
fi

USE_NODEJS="yes"
if test "$USE_NODEJS" = "yes"; then
    if ! rpm -q nodejs-stable-release > /dev/null 2>&1; then
	nodejs_release_rpm_base=nodejs-stable-release.noarch.rpm
	wget http://nodejs.tchol.org/repocfg/el/$nodejs_release_rpm_base
	run yum localinstall -y --nogpgcheck nodejs-stable-release.noarch.rpm
	rm $nodejs_release_rpm_base
	sed -i'' -e 's/enabled=1/enabled=0/g' /etc/yum.repos.d/nodejs-stable.repo
    fi
    yum_options="$yum_options --enablerepo=nodejs-stable"
fi

rpmbuild_options="${BUILD_OPTIONS}"

run yum update ${yum_options} -y
run yum install ${yum_options} -y rpm-build tar rpmdevtools ${DEPENDED_PACKAGES}
run yum clean ${yum_options} packages

# for debug
# rpmbuild_options="$rpmbuild_options --define 'optflags -O0 -ggdb3'"

cat <<EOF > $BUILD_SCRIPT
#!/bin/sh

if [ ! -f ~/.rpmmacros ]; then
    cat <<EOM > ~/.rpmmacros
%_topdir \$HOME/rpm
EOM
fi

# rm -rf rpm
mkdir -p rpm/SOURCES
mkdir -p rpm/SPECS
mkdir -p rpm/BUILD
mkdir -p rpm/RPMS
mkdir -p rpm/SRPMS

cp /tmp/${PACKAGE}.spec rpm/SPECS/
for source in $(spectool rpm/SPECS/${PACKAGE}.spec | sed -e 's,.*,,'); do
  if [ ! -f rpm/SOURCES/$source ]; then
    spectool -g -R rpm/SPECS/${PACKAGE}.spec
    break
  fi
done

chmod o+rx . rpm rpm/RPMS rpm/SRPMS

rpmbuild -ba ${rpmbuild_options} rpm/SPECS/${PACKAGE}.spec
EOF

run chmod +x $BUILD_SCRIPT
run su - $USER_NAME $BUILD_SCRIPT
