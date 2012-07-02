Name:       nodejs-nroonga
Version:    0.1.6
Release:    1%{?dist}
Summary:    A library for building groonga powered nodes
License:    LGPLv2+
Group:      System Environment/Libraries
URL:        http://nroonga.github.com
Source0:    http://registry.npmjs.org/nroonga/-/nroonga-%{version}.tgz
BuildRoot:  %{_tmppath}/%{name}-%{version}-%{release}-root-%(%{__id_u} -n)

BuildRequires:  nodejs-devel
BuildRequires:  node-gyp
BuildRequires:  npm
BuildRequires:  groonga-devel

Requires:       groonga-libs
%if !(0%{?fedora} >= 17)
Requires:       nodejs
Requires:       nodejs-msgpack2
%endif

%description
%{summary}.

%prep
%setup -q -n package

%build
node-gyp configure
node-gyp build

%install
rm -rf %{buildroot}

mkdir -p %{buildroot}%{nodejs_libdir}/nroonga/build/Release
cp -pr lib package.json %{buildroot}%{nodejs_libdir}/nroonga
cp -pr build/Release/nroonga_bindings.node \
    %{buildroot}%{nodejs_libdir}/nroonga/build/Release/

%clean
node-gyp clean
rm -rf %{buildroot}

%files
%defattr(-,root,root,-)
%{nodejs_libdir}/nroonga
%doc README.md license/lgpl-2.1.txt

%changelog
* Thu Jul 5 2012 Kouhei Sutou <kou@clear-code.com> - 0.1.7-1
- initial package
