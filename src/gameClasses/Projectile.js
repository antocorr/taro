var Projectile = IgeEntityBox2d.extend({
	classId: 'Projectile',

	init: function (data, entityIdFromServer) {
		IgeEntityBox2d.prototype.init.call(this, data.defaultData);
		this.id(entityIdFromServer);
		var self = this;
		if (ige.isClient) {
			this._pixiContainer = new PIXI.Container();
		}
		self.category('projectile');
		var projectileData = {};
		if (ige.isClient) {
			projectileData = ige.game.getAsset('projectileTypes', data.type);
			projectileData = _.pick(projectileData, ige.client.keysToAddBeforeRender)
		}

		self.entityId = this._id;

		self._stats = Object.assign(
			data,
			projectileData
		)

		// dont save variables in _stats as _stats is stringified and synced
		// and some variables of type unit, item, projectile may contain circular json objects 
		if (self._stats.variables) {
			self.variables = self._stats.variables;
			delete self._stats.variables;
		}

		console.log(self.variables)

		// set projectile state to default
		if (!self._stats.stateId) {
			for (var stateKey in self._stats.states) {
				var state = self._stats.states[stateKey];
				if (state && state.name === 'default') {
					self._stats.stateId = stateKey;
					break;
				}
			}
		}

		if (ige.isServer) {
			self.mount(ige.$('baseScene'));
		}
		
		if (self._stats.states) {
			var currentState = self._stats.states[self._stats.stateId];
			if (currentState) {
				var body = self._stats.bodies && self._stats.bodies[currentState.body] || { type: 'none' };;
				if (body) {
					self._stats.currentBody = body;
					self.width(self._stats.currentBody.width);
					self.height(self._stats.currentBody.height);
				}
				else {
					// console.log('No body found for projectile', this._stats.name)
					return;
				}
			}
		}
		
		self.addComponent(AttributeComponent) // every projectile gets one
		// convert number variables into Int
		self.parseEntityObject(self._stats);

		// console.log(self._stats.lifeSpan)
		if (self._stats.lifeSpan != undefined) {
			this.lifeSpan(self._stats.lifeSpan)
		}
		
		this.updateBody(data.defaultData);
		// console.log("previousFrame", this.previousFrame)
		if (ige.isServer) {
			if (this._stats.streamMode != undefined) {
				this.streamMode(this._stats.streamMode);
			}
			else {
				this.streamMode(0)
			}

			// only stream if projectile wasn't created via item.use(). item.use() will spawn projectiles on all players clients

			ige.server.totalProjectilesCreated++;
		}
		else if (ige.isClient) {
			if (currentState) {
				var defaultAnimation = this._stats.animations[currentState.animation];
				this.createPixiTexture(defaultAnimation && defaultAnimation.frames[0] - 1, data.defaultData);
			}
			self.drawBounds(false)

			// self.addComponent(AttributeBarsContainerComponent);
			self.updateLayer();
			self.updateTexture();
			self.mouseEvents();
			self.mount(ige.pixi.world);
		}
		this.playEffect('create');

		// add behaviour also have isClient block so we will have to execute this in both client and server
		this.addBehaviour('projectileBehaviour', this._behaviour);
		this.scaleDimensions(this._stats.width, this._stats.height);
	},

	_behaviour: function (ctx) {
		var self = this;
		this.processBox2dQueue();
	},

	// apply texture based on state
	updateTexture: function () {
		var self = this;
		IgeEntity.prototype.updateTexture.call(this)
	},

	streamUpdateData: function (queuedData) {
		IgeEntity.prototype.streamUpdateData.call(this, data);
		for (var i = 0; i < queuedData.length; i++) {
			var data = queuedData[i];
			for (attrName in data) {	
				var newValue = data[attrName];
            
		
				switch (attrName) {
					case 'anim':
						if (ige.isClient) {
							var animationId = newValue;
							this.applyAnimationById(animationId);
						}
						break;

					case 'scaleBody':
						if (ige.isServer) {
							// finding all attach entities before changing body dimensions
							if (this.jointsAttached) {
								var attachedEntities = {};
								for (var entityId in this.jointsAttached) {
									var entity = this.jointsAttached[entityId];
									if (entityId != this.id()) {
										attachedEntities[entityId] = true;
									}
								}
							}

							this._scaleBox2dBody(newValue);
						} else if (ige.isClient) {
							this._stats.scale = newValue;
							this._scaleTexture();
						}
						break;

					case 'stateId':
						var stateId = newValue;
						if (ige.isClient) {
							this.setState(stateId)
							this.updateLayer();
							this.applyAnimationForState(newValue);
						}
						break;
				}
			}
		}
	},

	tick: function (ctx) {
		IgeEntity.prototype.tick.call(this, ctx);
	},

	getOwner: function () {
		var self = this;

		return self._stats && self._stats.sourceItemId && ige.$(self._stats.sourceItemId);
	},
	destroy: function () {
		this.playEffect('destroy');
		IgeEntityBox2d.prototype.destroy.call(this);
	}
});

if (typeof (module) !== 'undefined' && typeof (module.exports) !== 'undefined') { module.exports = Projectile; }