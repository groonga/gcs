Name:       nodejs-msgpack2
Version:    0.1.7
Release:    1%{?dist}
Summary:    Latest version of node.js msgpack bindings
License:    BSD
Group:      System Environment/Libraries
URL:        https://github.com/JulesAU/node-msgpack
Source0:    http://registry.npmjs.org/msgpack2/-/msgpack2-%{version}.tgz
BuildRoot:  %{_tmppath}/%{name}-%{version}-%{release}-root-%(%{__id_u} -n)

BuildRequires:  nodejs-devel
BuildRequires:  nodejs-waf

%if !(0%{?fedora} >= 17)
Requires:       nodejs
%endif

%description
%{summary}.

%prep
%setup -q -n %{name}

%build
make

%install
rm -rf %{buildroot}

mkdir -p %{buildroot}%{nodejs_libdir}/msgpack2/build/Release
cp -pr lib package.json %{buildroot}%{nodejs_libdir}/msgpack2
cp -pr build/Release/mpBindings.node \
    %{buildroot}%{nodejs_libdir}/msgpack2/build/Release/

%clean
make clean
rm -rf %{buildroot}

%files
%defattr(-,root,root,-)
%{nodejs_libdir}/msgpack2
%doc README.md LICENSE

%changelog
* Thu Jul 5 2012 Kouhei Sutou <kou@clear-code.com> - 0.1.7-1
- initial package
