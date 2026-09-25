################################################################################
#
# tigeredgeserver (Air-Gapped Offline Hardened)
#
################################################################################

TIGEREDGESERVER_VERSION = 1.0.0
TIGEREDGESERVER_SITE = $(TOPDIR)/../tigeredgeserver
TIGEREDGESERVER_SITE_METHOD = local

TIGEREDGESERVER_DEPENDENCIES = host-rustc host-go sqlite

define TIGEREDGESERVER_BUILD_CMDS
	cd $(@D)/cmd/engine && \
		cargo build --release --offline --target=$(RUSTC_TARGET_NAME)
	cd $(@D)/cmd/gateway && \
		CGO_ENABLED=0 GOOS=linux GOARCH=$(GO_ARCH) go build -mod=vendor -ldflags="-s -w" -o gateway main.go
endef

define TIGEREDGESERVER_INSTALL_TARGET_CMDS
	$(INSTALL) -d -m 0700 $(TARGET_DIR)/etc/tigeredgeserver/config
	$(INSTALL) -d -m 0700 $(TARGET_DIR)/var/secure
	$(INSTALL) -d -m 0755 $(TARGET_DIR)/usr/bin

	$(INSTALL) -D -m 0600 $(@D)/config/* $(TARGET_DIR)/etc/tigeredgeserver/config/
	$(INSTALL) -D -m 0755 $(@D)/cmd/engine/target/$(RUSTC_TARGET_NAME)/release/engine $(TARGET_DIR)/usr/bin/engine
	$(INSTALL) -D -m 0755 $(@D)/cmd/gateway/gateway $(TARGET_DIR)/usr/bin/gateway
	$(INSTALL) -D -m 0700 $(@D)/scripts/harden_system.sh $(TARGET_DIR)/usr/bin/harden_system.sh
endef

$(eval $(generic-package))
