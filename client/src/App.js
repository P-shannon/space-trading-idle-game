import Auth from './modules/Auth'
import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

class App extends Component {
	constructor(){
		super()
		this.state = {
			auth: Auth.isUserAuthenticated(),
			data: {},
			activeRegions: [],
			activeRegionData: null,
			didStateUpdate: false,

		}
		this.handleChange = this.handleChange.bind(this)
		this.handleSubmission = this.handleSubmission.bind(this)
		this.logout = this.logout.bind(this)
		this.saveData = this.saveData.bind(this)
		this.loadData = this.loadData.bind(this)
		this.fetchResourceData = this.fetchResourceData.bind(this)
		this.fetchRegions = this.fetchRegions.bind(this)
		this.occupyRegion = this.occupyRegion.bind(this)
		this.abandonRegion = this.abandonRegion.bind(this)
		this.collectResource = this.collectResource.bind(this)
		this.autoCollect = this.autoCollect.bind(this)
		this.incrementIncome = this.incrementIncome.bind(this)
		this.setUpgrades = this.setUpgrades.bind(this)
        this.showUpgrades = this.showUpgrades.bind(this)
	}

	componentDidMount(){
		this.state.auth ? this.loadData() : null
		this.autoCollect()
	}

	handleChange(event){
		console.log('Tick!')
		this.setState({
			[event.target.name]: event.target.value
		})
	}

	handleSubmission(e,url,method){
		const decideBodyType = ()=>{
			switch(url){
				case '/login':
				return JSON.stringify({
				username: this.state.loginUsername,
				password: this.state.loginPassword,
				})

				case '/users':
				return JSON.stringify({
				user: {
					username: this.state.registerUsername,
					password: this.state.registerPassword,
					}
				})
			}

		}
		e.preventDefault()
		console.log(`Fetching to: ${url} with the ${method} method.`)
		fetch(url,
		{
			method: method,
			headers: {
				'Content-Type':'application/json',
			},
			body: decideBodyType(),
		})
		.then(res => res.json())
		.then(res => {
			console.log('response',res)
			if (res.token){
				Auth.authenticateToken(res.token)
				this.setState({
					auth: Auth.isUserAuthenticated(),
					loginUsername: "",
					loginPassword: "",
					registerUsername: "",
					registerPassword: "",

				})
			}
			else{
				console.warn('Token not recieved!')
			}
		})
		.then(res => {
			this.loadData()
		})
		.catch(error => console.warn('error',error))
	}

	logout(){
		fetch('/logout',
		{
			method: "delete",
			headers: {
				'Authorization': `Token ${Auth.getToken()}`,
				token: Auth.getToken(),
			}
		})
		.then(res => {
			Auth.deauthenticateUser()
			console.log('res',res)
			this.setState({
				auth: Auth.isUserAuthenticated(),
				loginUsername: "",
				loginPassword: "",
				data: null,
			})
		})
	}
	saveRegionData(id){
		let data = this.state.activeRegionData
		console.log('Saving region data...', data)
		fetch('/game/regionsave',{
			method: "put",
			headers: {
				'Content-Type':'application/json',
				'Authorization': `Token ${Auth.getToken()}`,
				token: Auth.getToken(),
			},
			body: JSON.stringify({id:id,data:data})
		})
		.then(res => res.json())
		.then(res => console.log(res))
		.catch(error => console.error('ERROR',error))
	}
	saveData(){
		let data = this.state.data
		console.log('Saving game data...', data)
		fetch('/game/save',{
			method: "put",
			headers: {
				'Content-Type':'application/json',
				'Authorization': `Token ${Auth.getToken()}`,
				token: Auth.getToken(),
			},
			body: JSON.stringify({data:data})
		})
		.then(res => res.json())
		.then(res => console.log(res))
		.catch(error => console.error('ERROR',error))
	}

	loadData(){
		console.log('loading game data...')
		this.fetchResourceData()
		fetch('/game/load',{
			headers:{
				"Authorization":`Token ${Auth.getToken()}`,
				token: Auth.getToken()
				}
			}
		)
		.then(res=>res.json())
		.then(res=>{
			console.log('res',res)
			if (res.user.data){
				console.log('YES!')

				this.setState({
					data: JSON.parse(res.user.data)
				})
				if (res.user.regions.length){
					this.setState({
						activeRegions: res.user.regions,
						activeRegionData: JSON.parse(res.user.regions[0].region.data)
					})
				}
				else{
					this.setState({
						activeRegions: [],
						activeRegionData: null
					})
				}
			}
			else{
				console.warn('Why!?!?')
				this.setState({
					data: {
						bings: Number(0)
					}
				})
			}
		})
		.catch(error => console.error('ERROR',error))
	}
	fetchResourceData(){
		console.log('fetching resources...')
		fetch('/resources')
		.then(res=>res.json())
		.then(res=>{
			this.setState({
				resources: res.resources
			})
		})
	}
	fetchRegions(){
		console.log('fetching regions...')
		fetch('/regions')
		.then(res=>res.json())
		.then(res=>{
			let vacants = res.regions.filter(elem=>!elem.region.user_id)
			console.log('vacants',vacants)
			this.setState({
				vacantRegions : vacants
			})
		})
		.catch(error => console.error('ERROR',error))
	}

	occupyRegion(region_id){
		this.saveData()
		fetch('/game/occupy',{
			method: "put",
			headers: {
				'Content-Type':'application/json',
				'Authorization': `Token ${Auth.getToken()}`,
				token: Auth.getToken()
			},
			body: JSON.stringify({id:region_id})
		})
		.then(res=>res.json())
		.then(res=>{
			this.loadData()
			this.setState({
				vacantRegions:null
			})
		})
		.catch(error=>console.error('ERROR',error))
	}

	abandonRegion(region_id){
		this.saveData()
		fetch('/game/abandon',{
			method: "put",
			headers: {
				'Content-Type':'application/json',
				'Authorization': `Token ${Auth.getToken()}`,
				token: Auth.getToken()
			},
			body: JSON.stringify({id:region_id})
		})
		.then(res=>res.json())
		.then(res=>{
			this.loadData()
		})
		.catch(error=>console.error('ERROR',error))
	}

	collectResource(id,amount){
        console.log('collecting resource:',id,'Quantity:',amount)
		if (this.state.activeRegionData[id]<=0){
			console.log('region void of resource')
			return false
		}
		else if(this.state.activeRegionData[id]<amount){
			amount = this.state.activeRegionData[id]
		}
		console.log('Bing!',this.state.data)
		console.log('Zing!',this.state.activeRegionData)
		let data = Object.assign({},this.state.data)
		if (!data[id]) {
			data = this.setUpgrades(id)
			data[id] = 0
		}
		data[id]+=amount
		let regionData = Object.assign({},this.state.activeRegionData)
		regionData[id]-=amount
		this.setState({
			data: data,
			activeRegionData: regionData
		})
        return data
	}

	setUpgrades(id){
		console.log('setting next upgrade')
		let data = Object.assign({},this.state.data)
		console.log(this.state.data)
		if(!this.state.data.nextUpgrade){
			data.nextUpgrade = {}
		}
		data.nextUpgrade[id] = {}
		let resource = this.state.activeRegions[Math.floor(Math.random() * this.state.activeRegions.length)].resources[Math.floor(Math.random() * 3)].id
		data.nextUpgrade[id][resource]=[15,.5]
		console.log('temp',data)
		this.setState({
			data: data,
		})
		return data
	}

	incrementIncome(id,expense_id){
        console.log("iI!!")
		if(this.state.data.nextUpgrade){
			let temp = Object.assign({},this.state.data)
            console.log(temp[expense_id],':inventory; ',temp.nextUpgrade[id][expense_id][0],"expense")
			if(temp[expense_id] < temp.nextUpgrade[id][expense_id][0] || !temp[expense_id]){
				console.log('not enough.')
				return false
			}
            console.log('decrement...')
			temp = this.collectResource(expense_id,temp.nextUpgrade[id][expense_id][0] * -1)
			if(!this.state.data.income){
				temp.income = {}
			}
            if(!temp.income[id]){
                temp.income[id] = temp.nextUpgrade[id][expense_id][1]
            }
            else{
                temp.income[id] += temp.nextUpgrade[id][expense_id][1]
            }
			this.setState({
				data: temp
			})
		}
		else{
			console.log('nah')
			return false
		}
	}

	autoCollect(){
		if(!this.state.data || !this.state.data.income){
			setTimeout(()=>{this.autoCollect()},1000)
		}
		else{
			setInterval(()=>{
				for (var resource in this.state.data.income) {
	    			if (this.state.data.income.hasOwnProperty(resource)) {
	        			this.collectResource(resource,this.state.data.income[resource])
	    			}
				}
			},1000)
		}
	}

	showUpgrades(resource){
		if (this.state.data.nextUpgrade){
			if(this.state.data.nextUpgrade[resource]){
                console.log("boom",this.state.resources[Number(Object.keys(this.state.data.nextUpgrade[resource])[0]) - 1].name)
				return(
					<div>
						<span>>{this.state.data.nextUpgrade[resource][Object.keys(this.state.data.nextUpgrade[resource])[0]][0]} {this.state.resources[Number(Object.keys(this.state.data.nextUpgrade[resource])[0]) - 1].name} for an added income of {this.state.data.nextUpgrade[resource][Object.keys(this.state.data.nextUpgrade[resource])[0]][1]} per second</span>
                        <button onClick={()=>{this.incrementIncome(resource,Number(Object.keys(this.state.data.nextUpgrade[resource])[0]))}}>upgrade</button>
					</div>
				)
			}
		}
	}

	

  	render() {
  	console.log(this.state, '<----------- render')
    return (
			<div>
			{this.state.auth ? (
				<div>
					<p onClick={()=>{this.logout()}}>AUTH ACTIVE</p>
					<button onClick={()=>{this.fetchRegions()}}>Show vacant regions</button>
						{this.state.vacantRegions?(this.state.vacantRegions.map(elem=>{
							return(
								<div>
									<span>{elem.region.id}:{elem.region.name}</span>
									<button onClick={()=>{this.occupyRegion(elem.region.id)}}>Move in</button>
								</div>
						)})):(null)}
				</div>
				):null}
				<form onSubmit={(e)=>{this.handleSubmission(e,'/login','POST')}}>
					<label>Login</label>
					<input type="text" name="loginUsername" value={this.state.loginUsername} onChange={(e)=>{this.handleChange(e)}}/>
					<input type="text" name="loginPassword" value={this.state.loginPassword} onChange={(e)=>{this.handleChange(e)}}/>
					<input type="submit" value="Login"/>
				</form>
				<br/>
				<form onSubmit={(e)=>{this.handleSubmission(e,'/users','POST')}}>
					<label>Register</label>
					<input type="text" name="registerUsername" value={this.state.registerUsername} onChange={(e)=>{this.handleChange(e)}}/>
					<input type="text" name="registerPassword" value={this.state.registerPassword} onChange={(e)=>{this.handleChange(e)}}/>
					<input type="submit" value="Sign Up"/>
				</form>
				<br/>
				{this.state.activeRegions[0] ? (
					<div>
					{this.state.activeRegions[0].resources.map((elem)=>{
						return(<div>
						<span>{this.state.data[elem.id]||0} {elem.name}</span>
						<button onClick={()=>{
							this.collectResource(elem.id,1)
						}}>Collect</button>
						<p>Upgrades:</p>
						{this.showUpgrades(elem.id)}
                        <hr/>
						</div>)
					})} 

						<p>{this.state.data.bings} bings</p>
						<button onClick={()=>{
							console.log('Bing!',this.state.data.bings)
							let data = Object.assign({},this.state.data)
							data.bings++
							this.setState({
								data: data
							})
						}}>Bing!</button>
						<button onClick={()=>{this.saveData(),this.saveRegionData(8)}}>Save!</button>
						<div>

						<p>Your regions:</p>
						{this.state.activeRegions.map((elem)=>{
							return( 
								<div>
									<span>{elem.region.name}</span>
									<button onClick={()=>{this.abandonRegion(elem.region.id)}}>Abandon</button>
								</div>
							)
						})}
						<button onClick={()=>{this.fetchRegions()}}>Show vacant regions</button>
						{this.state.vacantRegions?(this.state.vacantRegions.map(elem=>{
							return(
								<div>
									<span>{elem.region.id}:{elem.region.name}</span>
									<button onClick={()=>{this.occupyRegion(elem.region.id)}}>Move in</button>
								</div>
						)})):(null)}
						</div>
					</div>
					):(
					null
					)}
			</div>
    );
  }
}

export default App;
