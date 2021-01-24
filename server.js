const express = require('express')
const mysql = require('mysql')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const app = express()
const path = require('path')
const { rawListeners } = require('process')
const { v4: uuidv4 } = require('uuid');
var cookieParser = require('cookie-parser');

app.use(cookieParser())
//app.use(express.static(path.join(__dirname, 'static')));
app.use(express.json())
// app.use(express.urlencoded())
app.use(cors())

app.use(express.static(path.join(__dirname, 'build')));


// app.get('/*', function (req, res) {
   //  console.log('working1')
 //	res.sendFile(path.join(__dirname, 'build', 'index.html'));
// });

app.use(mainPageRouter)

function mainPageRouter(req,res,next){

    if(req.url=='/admin_login' || req.url == 'admin_panel' || req.url=='/sales_staff_login' || req.url == '/franchise_login'){

        res.sendFile(path.join(__dirname, 'build', 'index.html'));

    }else {
	   console.log("in")
 	    next()      

    }

} 


var con = mysql.createConnection({
    host: "localhost",
    database: "efriendadmin",
    user: "root",
    password: "Guwahati@123"
});

con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!!");
});
// app.get('/', (req, res) => {
//     console.log('fetch')
//     res.sendFile(path.join(__dirname, 'build', 'index.html'));
    
// })
// app.get('/admin', (req, res) => {
//     res.sendFile(__dirname + "/static/" + "login-page.html");
// })
// app.get('/sales_staff', (rq, res) => {
//     res.sendFile(__dirname + "/static/" + "login-sales-staff.html");
// })
// app.get('/franchise', (rq, res) => {
//     res.sendFile(__dirname + "/static/" + "login-franchise.html");
// })



app.get('/admin_panel', verifyToken, (req, res) => {
    console.log('hit')
    res.json({auth:true})
    // res.sendFile(__dirname + "/static/" + "main-page.html");

})
app.get('/franchise_panel', verifyToken, (req, res) => {
    // console.log('hit')
    res.json({auth:true})
    // res.sendFile(__dirname + "/static/" + "franchise-dashboard.html");

})
app.get('/api/sales_staff_panel', verifyToken, (req, res) => {
    console.log('hit')
    res.json({auth:true})
    // res.sendFile(__dirname + "/static/" + "sales-staff-dashboard.html");

})
app.post('/admin/validate', (req, res) => {
    console.log("req body " + req.body)
    const name = req.body.userName
    const password = req.body.password
    if (name == "" && password == "") {
        return
    }
    var query = `SELECT * FROM admins WHERE username=? and password=?`;
    con.query(query,[name,password], function(err, result) {
        if (err) {
            console.log("Errore login: " + err);
            // return res.send(400).json({auth:false})
        } else {
            console.log("DB", result)
                //check to see if the result is empty
            if (result.length > 0) {
                console.log('Data received from Db:');
                console.log(result[0].username);
                // console.log(result[0].username,result[0].password);
                if (name == result[0].username && password == result[0].password) {
                    console.log("true")
                    let token = jwt.sign(result[0].username, "123")
                    
                    res.cookie('tok',"token",{ maxAge: 9000000, httpOnly:false}).status(200).json({ auth: true, token: token ,name:result[0].username})
                } else {
                    res.json({ res: "failed" })
                }
            } else {
                res.status(400).json({ auth: false })

            }
        }
    });
})

app.get('/franchise_details',verifyToken,(req, res) => {
    console.log('get all data')
    let query = `SELECT * FROM franchises_login`;
    con.query(query, function(err, result1) {
        if (err) {
            console.log("Errore login: " + err);
        } else {

            if (result1.length > 0) {
                // console.log(result1)
                let FranchiseID = []
                result1.map(x=>{
                    FranchiseID.push(x['FranchiseID']) 
                })
                // console.log("ssID  ",ssID)
                
                let subDistArray = []
                let querySubDist = `SELECT * FROM franchises_subdistricts WHERE FranchiseID =?`
                FranchiseID.map((x,ind)=>{
                    con.query(querySubDist,[x],function(err,result2){
                        if(err){
                            console.log("Error login: "+err)
                        }else{
                            console.log(x," of ",result2)
                            subDistArray.push(result2)
                        }
                        if(ind == FranchiseID.length-1){ //we call on air function after we get the last data from data base (bcz we cant send res 
                                                    // after they send to client)
                            onAir()
                        }
                    })
                })
                function onAir(){
                    // console.log(subDistArray)
                    let franchiseWiseSubDist = {}
                    subDistArray.map(x=>{
                        
                        if(x.length!=0){
                            x.map(obj=>{
                                franchiseWiseSubDist[obj['FranchiseID']] = []
                            })
                            x.map(obj=>{
                                franchiseWiseSubDist[obj['FranchiseID']].push(obj['SubDistrict'])
                            })
                        }
                    })
                    console.log('obj  ',franchiseWiseSubDist)
                    res.json({data:result1,subDistObj:franchiseWiseSubDist})
                    // console.log("array to send",subDistArray)
                }
                // console.log(result1)
            } else { 
                res.json({data:[],subDistObj:[]})
            
            }
        }
    })
})



app.post('/add_franchise',verifyToken, (req, res) => {
    // console.log("delete SS")
    let username = req.body.name
    let password = req.body.password
    let phone = req.body.phone
    let email = req.body.email
    let subDistrict = req.body.subDistrict
    console.log(subDistrict)
    let franchiseID = uuidv4()
    // console.log("s")
    console.log(username,phone)

    let queryForDuplicateCheck = 'SELECT * FROM franchises_login WHERE Phone = ?'
    con.query(queryForDuplicateCheck,[phone],function (err, result1) {
        if (err) throw err;
        console.log(result1)
        if(result1.length>0){
                
              return res.json({flag:false})

        }else{
            // let queryForAddSalesStaff = "INSERT INTO sales_staffs_login (`Username`, `Password`,`Phone`,`SubDistrict`,`Email`,`SalesStaffID`) VALUES ?";
            let queryForAddSalesStaff = "INSERT INTO franchises_login (`Username`, `Password`,`Phone`,`Email`,`FranchiseID`) VALUES ?";
            let values = [
            [username,password,phone,email,franchiseID]
            ];
            con.query(queryForAddSalesStaff,[values],function (err, result2) {
                if (err) throw err;
                     console.log(result2)
                     subDistrict.map(x=>{
                        let queryForAddSalesStaff = "INSERT INTO franchises_subdistricts (`FranchiseID`,`SubDistrict`) VALUES ?";
                        let values = [
                        [franchiseID,x]
                        ];
                        con.query(queryForAddSalesStaff,[values],function (err, result3) {
                            if (err) throw err;
                            // console.log(result3)
                        });
                     })
                     res.json({flag:true})
                    
                        // res.json({flag:true})
                });
        }

    });
    
})

app.delete('/del_franchise_details',verifyToken, (req, res) => {
    let username = req.body.name
    let phone = req.body.phone
    let franchiseID = req.query.fid
    let query = 'DELETE FROM franchises_subdistricts WHERE FranchiseID=?'
    con.query(query,[franchiseID],function (err, result1) {
        if (err) throw err;
        console.log(result1)
        deleteFranchiseLoginData()

        if(result1.length>0){
                // console.log("123",result1)
            //   return res.json({flag:false})

        }else{
            console.log("456")

        }
    })

    function deleteFranchiseLoginData(){
                console.log("ppppp---------------")
                let query = 'DELETE FROM franchises_login WHERE FranchiseID = ?'
                con.query(query,[franchiseID],function (err, result2) {
                    if (err) throw err;
                    console.log(result2)
                    if(result2.length>0){
                            // console.log("123",result1)
                        res.json({flag:true})
            
                    }else{
                        console.log("456")
                        res.json({flag:true})
    
            
                    }
                })
    }

})   

    // console.log("delete sales staff")
    //     let username = req.body.name
    //     let phone = req.body.phones
    //     let salesStaffID = req.query.id
    //     console.log('ssID = '+salesStaffID)
        
    
    //     let query1 = 'DELETE FROM sales_staffs_subdistricts WHERE SalesStaffID = ?'
    //     con.query(query1,[salesStaffID],function (err, result1) {
    //         if (err) throw err;
    //         console.log(result1)
    //         deleteSalesStaffFromLoginData()
    //         if(result1.length>0){
    //                 console.log("123",result1)
    //             //   return res.json({flag:false})

    //         }else{
    //             // console.log("456")

    //         }

    //     })
    //     function deleteSalesStaffFromLoginData(){
    //         console.log("ppppp---------------")
    //         let query = 'DELETE FROM sales_staffs_login WHERE SalesStaffID = ?'
    //         con.query(query,[salesStaffID],function (err, result2) {
    //             if (err) throw err;
    //             console.log(result2)
    //             if(result2.length>0){
    //                     // console.log("123",result1)
    //                 res.json({flag:true})
        
    //             }else{
    //                 console.log("456")
    //                 res.json({flag:true})

        
    //             }
    //         })
    //     }





app.put('/edit_franchise',verifyToken, (req, res) => {
    console.log("edit SS")
    // console.log("ADD SS")
    let username = req.body.name
    let password = req.body.password
    let phone = req.body.phone
    let email = req.body.email
    let subDistrict = req.body.subDistrict
    console.log("SUBDIST++++",subDistrict)
    let prevName = req.body.prevName
    let prevPhone = req.body.prevPhone
    // console.log(prevName,prevPhone)
    // console.log(subDistrict)

    let queryForDuplicateCheck = 'SELECT * FROM franchises_login WHERE Phone = ?'
    con.query(queryForDuplicateCheck,[prevPhone],function (err, result1) {
        if (err) throw err;
        // console.log("neededdd=========",result1)
        let FranchiseID = result1[0]['FranchiseID']
        if(result1.length>0){
            console.log(result1)
            // let queryForAddSalesStaff ='UPDATE sales_staffs_login SET Username = ?, Password = ?,Phone=?,`SubDistrict`=?,Email=? WHERE Username=? AND Phone=?'
            let queryForAddSalesStaff ='UPDATE franchises_login SET Username = ?, Password = ?,Phone=?,Email=? WHERE Username=? AND Phone=?'
            let values = [
            [username,password,phone,subDistrict,email]
            ];
            con.query(queryForAddSalesStaff,[username,password,phone,email,prevName,prevPhone],function (err, result2) {
                if (err) throw err;
                // console.log(result2)
                
                // const deleteFunPromise = new Promise(deleteDuplicateFromSalesStaffSubDist)

                // deleteFunPromise.then((x)=>{
                //     console.log('fun complteted',x)
                // })

                console.log('hi how r you')
                console.log("SSID  ",FranchiseID)
                let queryForDelete = 'DELETE FROM franchises_subdistricts WHERE FranchiseID = ?'
                    // subDistrict.map((x,i)=>{
                        // console.log(x)
                con.query(queryForDelete,[FranchiseID],function (err, result4) {
                            if (err) throw err;
                            console.log("e",result4)
                            // if(i===subDistrict.length-1){
                                insertSalesStaffSubDistrict()
                            // }
                            
                 })
                // })
                // console.log("asdadad")
                let insertSalesStaffSubDistrict = () =>{
                    subDistrict.map((x,i)=>{
                        let queryForAddSalesStaff = "INSERT INTO franchises_subdistricts (`FranchiseID`,`SubDistrict`) VALUES ?";
                        let values = [
                        [FranchiseID,x]
                        ];
                        con.query(queryForAddSalesStaff,[values],function (err, result3) {
                            if (err) throw err;
                            // console.log(result3)
                            if(i===subDistrict.length-1){
                                return res.json({flag:true})
                            }
                        });
                     })
                }
                


            });

        }else{
            return res.json({flag:false})
            
        }
        // const deleteDuplicateFromSalesStaffSubDist = () =>{
        //     console.log('hi how r you')
        //     let queryForDelete = 'DELETE FROM sales_staffs_subdistricts WHERE SalesStaffID = ? AND SubDistrict = ?'
        //     subDistrict.map(x=>{
        //         console.log(x)
        //         con.query(queryForDelete,[salesStaffID,x],function (err, result4) {
        //             if (err) throw err;
        //             console.log("e",result4)
                    
        //         })
        //     })
        //     // return
            
        // }

        

    });
    
})


app.post('/franchise/validate', (req, res) => {
    console.log("req body " + req.body)
    const name = req.body.userName
    const password = req.body.password
    if (name == "" && password == "") {
        return
    }
    var query = `SELECT * FROM franchises_login WHERE Username=? and Password=?`;
    con.query(query,[name,password],function(err, result) {
        if (err) {
            console.log("Errore login: " + err);
            // return res.send(400).json({auth:false})
        } else {
            console.log("DB", result)
            let subDistrict = []
            //check to see if the result is empty
            if (result.length > 0) {
                //we need to get the subdistricts of the logged in franchise
                let query1 = `SELECT * FROM franchises_subdistricts WHERE FranchiseID=?`
                con.query(query1,[result[0].FranchiseID],function (err, result4) {
                    if (err) throw err;
                    if(result4.length>0){
                            result4.map(x=>{
                                subDistrict.push(x['SubDistrict'])
                             })
                             checkUserAndSendRes()
                        
                    }else{
                    }
            
                })
                
                function checkUserAndSendRes(){
                    if (name == result[0].Username && password == result[0].Password) {
                    
                        let token = jwt.sign(result[0].Username, "123")
                        res.status(200).json({ auth: true, token: token,name: result[0]['Username'],id:result[0]['FranchiseID'],subDistrict:subDistrict})
                    } else {
                        res.json({ res: "failed" })
                    }
                }
                
            } else {
                res.status(400).json({ auth: false })

            }
        }
    });
})
app.post('/api/sales_staff/validate', (req, res) => {
    console.log("req body " + req.body)
    const name = req.body.userName
    const password = req.body.password
    if (name == "" && password == "") {
        return
    }
    var query = `SELECT * FROM sales_staffs_login WHERE Username=? and Password=?`;
    con.query(query,[name,password],function(err, result) {
        if (err) {
            console.log("Errore login: " + err);
            // return res.send(400).json({auth:false})
        } else {
            console.log("DB", result)
                //check to see if the result is empty
            if (result.length > 0) {
                console.log('Data received from Db:');
                console.log(result[0].Username);
                // console.log(result[0].username,result[0].password);
                if (name == result[0].Username && password == result[0].Password) {
                    console.log("true")
                    let token = jwt.sign(result[0].Username, "123")
                    res.status(200).json({ auth: true, token: token,name: result[0]['Username'],id:result[0]['SalesStaffID'],subDistrict:result[0]['SubDistrict']})
                } else {
                    res.json({ res: "failed" })
                }
            } else {
                res.status(400).json({ auth: false })

            }
        }
    });
})




// Subscription Data
app.get('/subscription_data',verifyToken,(req,res)=>{

    let ssID = req.query.id
    let franchiseID = req.query.fid
    console.log(ssID,franchiseID)

    if(franchiseID){

        console.log('ffIDDD ',franchiseID)
        let queryForSubDist = `SELECT * FROM franchises_subdistricts WHERE FranchiseID=?`
        con.query(queryForSubDist,[franchiseID],function(err, result5) {
            if (err) {
                console.log("Errore login: " + err);
            } else {
                console.log("res -----",result5.length)
                subDistArray = []
                result5.map(x=>{
                    subDistArray.push(x['SubDistrict'])
                })
                console.log(subDistArray)
                selectDataFromSub(subDistArray)
    
            }
        })
        
    }else if(ssID){
        
        

        let queryForSubDist = `SELECT * FROM sales_staffs_subdistricts WHERE SalesStaffID = ?`
        con.query(queryForSubDist,[ssID], function(err, result5) {
            if (err) {
                console.log("Errore login: " + err);
            } else {
                
                subDistArray = []
                result5.map(x=>{
                    subDistArray.push(x['SubDistrict'])
                })
                
                selectDataFromSub(subDistArray)
    
            }
        })
    }else{


        let query = `SELECT * FROM subscriptions`
        con.query(query, function(err, result5) {
            if (err) {
            } else {
                
                // res.status(200).json({data:result5,btnLength:0})
                selectDataFromSub(null)
            }
        })
    }
    


    

    function selectDataFromSub(subDistArray){

        let query = "SELECT * FROM subscriptions";
        con.query(query, function(err, result) {
            if (err) {
                console.log("Errore login: " + err);
            } else {
               
                if (result.length > 0) {
                    // console.log(result.length,"-+-+-+-+-+-+-")
                    if(subDistArray!=null){
                        totalResult1 = result.filter(x=>{
                            for(let i=0;i<subDistArray.length;i++){
                                if(subDistArray[i]===x['Sub-District']){
                                    return x
                                }
                            }
                        })
                    }else{
                        totalResult1 = result
                    }

                    if(req.query.search){
                       
                        if(req.query.search==""){
                            res.status(200).json({data:result})
                            return
                        }
                        totalResult1 = totalResult1.filter(row=>{
                            for(let i=0;i<Object.keys(row).length;i++){
                                if(row[Object.keys(row)[i]].toString().toLowerCase()===req.query.search.toString().toLowerCase()){
                                    return row
                                }
                            }
                        })
                        
                        
                        res.status(200).json({data:totalResult1,btnLength:0})

                        // searchRes = result.filter(row=>{
                        //     Object.keys(row).forEach
                            // for(let i=0;i<Object.keys(row).length;i++){
                            //     if(row[Object.keys(row)[i]].toString().toLowerCase()==req.query.search.toString().toLowerCase()){
                            //         return row
                            //     }
                            // }
                            
                        // })
                        // let btnNums = Math.ceil(searchRes.length/100)
                        // let btnNums2 = Math.ceil(result.length/100)
                        // result = result.slice(0,100)
                        // if(searchRes.length==0){
                        //     res.status(200).json({data:result,dataLength:result.length,btnLength:btnNums2})
                        //     return
                        // }
                        // let startIndSearch = (req.query.page-1)*100
                        // let endIndSearch = (req.query.page)*100
                        // searchRes = searchRes.slice(startIndSearch,endIndSearch)
                       
                        // return res.status(200).json({data:searchRes,dataLength:searchRes.length,btnLength:btnNums})
                        
                    }else{
                       
                            
                            totalResult = result
                            
                            let btnNums = Math.ceil(totalResult1.length/100)
                            res.status(200).json({data:totalResult1,btnLength:btnNums})
                    }
    
    
                    
                } else { 
                    res.status(400).json({ auth: false })
    
                }
            }
        });
    }







    // console.log("hitter")
    // var query = "SELECT * FROM subscriptions";
    // con.query(query, function(err, result) {
    //     if (err) {
    //         console.log("Errore login: " + err);
    //         // return res.send(400).json({auth:false})
    //     } else {
    //         // console.log("DB", result)
    //             //check to see if the result is empty
    //         if (result.length > 0) {
    //             // let sliceRes = result.slice(0,50)
    //             // sliceRes = result

    //             // res.status(200).json({data:sliceRes})


    //             if(req.query.search){
    //                 // console.log('-------------------------------')
    //                 // console.log(req.query)

    //                 // console.log("working search",req.query.search)
    //                 if(req.query.search==""){
    //                     res.status(200).json({data:result})
    //                     return
    //                 }
    //                 // console.log(req.query.search)
    //                 searchRes = result.filter(row=>{
    //                     Object.keys(row).forEach
    //                     for(let i=0;i<Object.keys(row).length;i++){
    //                         if(row[Object.keys(row)[i]].toString().toLowerCase()==req.query.search.toString().toLowerCase()){
    //                             return row
    //                         }
    //                     }
                        
    //                 })
    //                 let btnNums = Math.ceil(searchRes.length/100)
    //                 let btnNums2 = Math.ceil(result.length/100)
    //                 result = result.slice(0,100)

    //                 // console.log(searchRes)
    //                 if(searchRes.length==0){
    //                     res.status(200).json({data:result,dataLength:result.length,btnLength:btnNums2})
    //                     return
    //                 }
    //                 // console.log(searchRes.length)
                  
    //                 let startIndSearch = (req.query.page-1)*100
    //                 let endIndSearch = (req.query.page)*100
    //                 // console.log("k",startIndSearch,endIndSearch)
    //                 searchRes = searchRes.slice(startIndSearch,endIndSearch)
    //                 // console.log("au",searchRes.length)
    //                 // searchRes = searchRes.slice(0,100)
    //                 // }
    //                 // console.log('-------------------------------')
    //                 // console.log(searchRes)
    //                 return res.status(200).json({data:searchRes,dataLength:searchRes.length,btnLength:btnNums})
                    
    //             }else{
                    
    //                 // console.log('-------------------------------')
    //                     //  console.log(req.query)
    //                     // console.log("working non search",req.query.search)
    //                     totalResult = result
    //                     // let startInd = (req.query.page-1)*100
    //                     // let endInd = (req.query.page)*100
    //                     // result = result.slice(startInd,endInd)
    //                     let btnNums = Math.ceil(totalResult.length/100)
    //                     res.status(200).json({data:result,btnLength:btnNums,dataLength:totalResult.length,dateFrom:totalResult[0]['Date'],dateTo:totalResult[totalResult.length-1]['Date']})
    //             }




    //         } else { 
    //             res.status(400).json({ auth: false })

    //         }
    //     }
    // });
})


app.get('/sales_staffs_subscriptions',verifyToken,(req,res)=>{

    console.log("sadasd",req.query.id)
    var query1 = `SELECT * FROM sales_staffs_subscriptions WHERE SalesStaffID = ?` ;

    con.query(query1,[req.query.id], function(err1, result1) {

        if (err1) {
            console.log("Errore login: " + err);
        } else {
            console.log('resss',result1)
            if (result1.length > 0) {
                console.log(result1)

                
                var query2 = "SELECT * FROM subscriptions";
                con.query(query2,function(err2, result2) {
                    if (err2) {
                        console.log("Errore login: " + err);
                       
                    } else {
                        // console.log("result1 ",result2)
                        if (result2.length > 0) {
                            // console.log("result1 ",result2)
                            // console.log("result2 ",result2[5])
                            
                           
                            let studentAdded = result2.filter(x=>{
                              
                                    for(let i=0;i<result1.length;i++){
                                        
                                        if(x['Ref ID']===result1[i]['StudentID']){
                                            return(x)
                                        }
                                    }
                                // })
                                    
                            })
                            return res.json({data:studentAdded})
                        }
                    }
                
                })
            
            
            }else{
                return res.json({data:[]})
            }
        }
    
    });


})



app.get('/registration_data',verifyToken,(req,res)=>{

    let ssID = req.query.id
    let franchiseID = req.query.fid
    console.log(ssID,franchiseID)
    if(franchiseID){

        console.log('ffIDDD ',franchiseID)
        let queryForSubDist = `SELECT * FROM franchises_subdistricts WHERE FranchiseID=?`
        con.query(queryForSubDist,[franchiseID],function(err, result5) {
            if (err) {
                console.log("Errore login: " + err);
            } else {
                console.log("res -----",result5.length)
                subDistArray = []
                result5.map(x=>{
                    subDistArray.push(x['SubDistrict'])
                })
                console.log("subdist",subDistArray)
                selectDataFromReg(subDistArray)
    
            }
        })
        
    }else if(ssID){
        console.log('ssIDDD ',ssID)
        let queryForSubDist = `SELECT * FROM sales_staffs_subdistricts WHERE SalesStaffID= ?`
        con.query(queryForSubDist,[ssID],function(err, result5) {
            if (err) {
                console.log("Errore login: " + err);
            } else {
                console.log("res -----",result5.length)
                subDistArray = []
                result5.map(x=>{
                    subDistArray.push(x['SubDistrict'])
                })
                console.log(subDistArray)
                selectDataFromReg(subDistArray)
    
            }
        })
    }else{


        let query = `SELECT * FROM registrations `
        con.query(query, function(err, result5) {
            if (err) {
            } else {
                console.log(result5.length)
                // res.status(200).json({data:result5,btnLength:0})
                selectDataFromReg(null)
            }
        })


    }
    


    

    function selectDataFromReg(subDistArray){

        let query = "SELECT * FROM registrations";
        con.query(query, function(err, result) {
            if (err) {
                console.log("Errore login: " + err);
            } else {
               
                if (result.length > 0) {
                    // console.log(result.length,"-+-+-+-+-+-+-")
                    if(subDistArray!=null){
                        totalResult1 = result.filter(x=>{
                            for(let i=0;i<subDistArray.length;i++){
                                if(subDistArray[i]===x['Sub-District']){
                                    return x
                                }
                            }
                        })
                    }else{
                        totalResult1 = result
                    }
                    
                    if(req.query.search){
                       
                        if(req.query.search==""){
                            res.status(200).json({data:result})
                            return
                        }
                        // console.log("===",totalResult1)
                        totalResult1 = totalResult1.filter(row=>{
                            for(let i=0;i<Object.keys(row).length;i++){
                                // console.log("*************",row[Object.keys(row)[i]])
                                if(row[Object.keys(row)[i]].toString().toLowerCase()===req.query.search.toString().toLowerCase()){
                                    return row
                                }
                            }
                        })
                        
                        
                        res.status(200).json({data:totalResult1,btnLength:0})

                        // searchRes = result.filter(row=>{
                        //     Object.keys(row).forEach
                            // for(let i=0;i<Object.keys(row).length;i++){
                            //     if(row[Object.keys(row)[i]].toString().toLowerCase()==req.query.search.toString().toLowerCase()){
                            //         return row
                            //     }
                            // }
                            
                        // })
                        // let btnNums = Math.ceil(searchRes.length/100)
                        // let btnNums2 = Math.ceil(result.length/100)
                        // result = result.slice(0,100)
                        // if(searchRes.length==0){
                        //     res.status(200).json({data:result,dataLength:result.length,btnLength:btnNums2})
                        //     return
                        // }
                        // let startIndSearch = (req.query.page-1)*100
                        // let endIndSearch = (req.query.page)*100
                        // searchRes = searchRes.slice(startIndSearch,endIndSearch)
                       
                        // return res.status(200).json({data:searchRes,dataLength:searchRes.length,btnLength:btnNums})
                        
                    }else{
                       
                            
                            totalResult = result
                            
                            let btnNums = Math.ceil(totalResult1.length/100)
                            res.status(200).json({data:totalResult1,btnLength:btnNums})
                    }
    
    
                    
                } else { 
                    res.status(400).json({ auth: false })
    
                }
            }
        });
    }

    
})

app.post('/add_subscription',verifyToken, (req, res) => {
    const name = req.body.name
    const phone = req.body.phone
    const subDistrict = req.body.subDistrict
    const district = req.body.district
    const classVal = req.body.class
    let ssID = req.query.id
    if (name == "" || phone == "" || subDistrict == "" || district == "" || classVal =="") {
        return
    }
    let query = `SELECT * FROM subscriptions WHERE Name=? and Mobile=? and District=? 'Sub-District'=?`; 
    con.query(query,[name,phone,district,subDistrict],function(err, result1) {
        if (err) {
            console.log("Errore login: " + err);
        } else {
          
            if (result1.length > 0) {
                
                let studentID = result1[0]['Ref ID']
                // console.log("************",studentID)
                let queryForCheckSSDist = 'SELECT * from sales_staffs_subdistricts WHERE SalesStaffID = ?'
                con.query(queryForCheckSSDist,[ssID],function(err,result6){
                    console.log("****************",result6,result1)
                    let salesStaffSubDist = []

                    result6.map(x=>{
                        salesStaffSubDist.push(x['SubDistrict'])
                    })
                    console.log('+++++',salesStaffSubDist)
                    if(salesStaffSubDist.includes(result1[0]['Sub-District'])){
                        console.log('in Dis')

                        addSalesStaffSub()
                    }else{
                        console.log('not in Dis')

                        return res.status(400).json({ flag: false })
                    }
                })

                const addSalesStaffSub = ()=>{

                var queryForNotAddExistingStudent = `SELECT * from sales_staffs_subscriptions WHERE StudentID=?`;
                con.query(queryForNotAddExistingStudent,[studentID],function(err, result4) {
                    if (err) {
                        console.log("Errore login: " + err);
                    } else {
                        console.log("sss----------", result4)
                        if(result4.length>0){
                            // return res.json({})
                            console.log("This student is already selected")
                            return res.status(400).json({ flag: false })

                        }else{

                            let queryForSSID = `SELECT * FROM sales_staffs_login WHERE SalesStaffID='${ssID}'`
                            con.query(queryForSSID, function(err, result2) {
                                if (err) {
                                    console.log("Errore login: " + err);
                                } else {
                                    console.log( result2)
            
                                    
                                    if (result2.length > 0) {
                                       
                                     
                                       
                                        var queryForAddStudent = "INSERT INTO sales_staffs_subscriptions (`StudentID`, `SalesStaffID`) VALUES ?";
                                        var values = [
                                          [studentID,ssID]
                                        ];
                                        con.query(queryForAddStudent,[values],function (err, result3) {
                                            if (err) throw err;
                                            
                                            console.log("1 record inserted");
                                            return res.json({flag:true})
            
                                        });
            
                                    } else { 
                                        console.log('user not found')
                                            return res.status(400).json({ flag: false })
            
                                    }
                                }
                            })
                        }
                    }
                })
            } 
               

            } else {
                res.status(400).json({ flag: false })

            }
        }
    });
})

app.get('/sales_staff_details',verifyToken,(req, res) => {
    console.log('get all data -------')
    let query = `SELECT * FROM sales_staffs_login`;
    con.query(query, function(err, result1) {
        if (err) {
            console.log("Errore login: " + err);
        } else {

            if (result1.length > 0) {
                // console.log(result1)
                let ssID = []
                result1.map(x=>{
                    ssID.push(x['SalesStaffID']) 
                })
                // console.log("ssID  ",ssID)
                
                let subDistArray = []
                let querySubDist = `SELECT * FROM sales_staffs_subdistricts WHERE SalesStaffID =?`
                ssID.map((x,ind)=>{
                    con.query(querySubDist,[x],function(err,result2){
                        if(err){
                            console.log("Error login: "+err)
                        }else{
                            // console.log( x," of ",result2)
                            subDistArray.push(result2)
                        }
                        if(ind == ssID.length-1){ //we call on air function after we get the last data from data base (bcz we cant send res 
                                                    // after they send to client)
                            onAir()
                        }
                    })
                })
                function onAir(){
                    // console.log(subDistArray)
                    let ssIDWiseSubDist = {}
                    subDistArray.map(x=>{
                        
                        if(x.length!=0){
                            x.map(obj=>{
                                ssIDWiseSubDist[obj['SalesStaffID']] = []
                            })
                            x.map(obj=>{
                                ssIDWiseSubDist[obj['SalesStaffID']].push(obj['SubDistrict'])
                            })
                        }
                    })
                    // console.log('obj  ',ssIDWiseSubDist)
                    res.json({data:result1,subDistObj:ssIDWiseSubDist})
                    // console.log("array to send",subDistArray)
                }
                // console.log(result1)
            } else { 
                res.json({data:[],subDistObj:[]})
            
            }
        }
    })
})

app.delete('/del_sales_staff_details',verifyToken,(req, res) => {
    console.log("delete sales staff")
    let username = req.body.name
    let phone = req.body.phones
    let salesStaffID = req.query.id
    console.log('ssID = '+salesStaffID)
    
   
    let query1 = 'DELETE FROM sales_staffs_subdistricts WHERE SalesStaffID = ?'
    con.query(query1,[salesStaffID],function (err, result1) {
        if (err) throw err;
        console.log(result1)
       // deleteSalesStaffFromLoginData()
        deleteSalesStaffsSubs()
        if(result1.length>0){
                console.log("123",result1)
            //   return res.json({flag:false})

        }else{
            // console.log("456")

        }

    })
    function deleteSalesStaffsSubs(){
        let query = 'DELETE FROM sales_staffs_subscriptions WHERE SalesStaffID = ?'
        con.query(query,[salesStaffID],function (err, result2) {
            if (err) throw err;
            // console.log(result2)
        deleteSalesStaffFromLoginData()

            if(result2.length>0){
                    // console.log("123",result1)
                //  res.json({flag:true})
    
            }else{
                // console.log("456")
                // res.json({flag:true})

    
            }
        })
    }


    function deleteSalesStaffFromLoginData(){
        console.log("ppppp---------------")
        let query = 'DELETE FROM sales_staffs_login WHERE SalesStaffID = ?'
        con.query(query,[salesStaffID],function (err, result2) {
            if (err) throw err;
            console.log(result2)
            if(result2.length>0){
                    // console.log("123",result1)
                 res.json({flag:true})
    
            }else{
                console.log("456")
                res.json({flag:true})

    
            }
        })
    }
    
})
app.post('/add_sales_staff',verifyToken,(req, res) => {
    // console.log("delete SS")
    let username = req.body.name
    let password = req.body.password
    let phone = req.body.phone
    let email = req.body.email
    let subDistrict = req.body.subDistrict
    console.log(subDistrict)
    let salesStaffID = uuidv4()
    // console.log("s")
    console.log(username,phone)

    

    let queryForDuplicateCheck = 'SELECT * FROM sales_staffs_login WHERE Phone = ?'
    con.query(queryForDuplicateCheck,[phone],function (err, result1) {
        if (err) throw err;
        console.log(result1)
        if(result1.length>0){
                
              return res.json({flag:false})

        }else{
            // let queryForAddSalesStaff = "INSERT INTO sales_staffs_login (`Username`, `Password`,`Phone`,`SubDistrict`,`Email`,`SalesStaffID`) VALUES ?";
            let queryForAddSalesStaff = "INSERT INTO sales_staffs_login (`Username`, `Password`,`Phone`,`Email`,`SalesStaffID`) VALUES ?";
            let values = [
            [username,password,phone,email,salesStaffID]
            ];
            con.query(queryForAddSalesStaff,[values],function (err, result2) {
                if (err) throw err;
                     console.log(result2)
                     subDistrict.map(x=>{
                        let queryForAddSalesStaff = "INSERT INTO sales_staffs_subdistricts (`SalesStaffID`,`SubDistrict`) VALUES ?";
                        let values = [
                        [salesStaffID,x]
                        ];
                        con.query(queryForAddSalesStaff,[values],function (err, result3) {
                            if (err) throw err;
                            // console.log(result3)
                        });
                     })
                     res.json({flag:true})
                    
                        // res.json({flag:true})
                });
        }

    });
    
})

app.put('/edit_sales_staff',verifyToken,(req, res) => {
    console.log("edit SS")
    // console.log("ADD SS")
    let username = req.body.name
    let password = req.body.password
    let phone = req.body.phone
    let email = req.body.email
    let subDistrict = req.body.subDistrict
    console.log("SUBDIST++++",subDistrict)
    let prevName = req.body.prevName
    let prevPhone = req.body.prevPhone
    // console.log(prevName,prevPhone)
    // console.log(subDistrict)

    let queryForDuplicateCheck = 'SELECT * FROM sales_staffs_login WHERE Phone = ?'
    con.query(queryForDuplicateCheck,[prevName,prevPhone],function (err, result1) {
        if (err) throw err;
        // console.log("neededdd=========",result1)
        console.log("neededdd=========",result1)
        let salesStaffID = result1[0]['SalesStaffID']
        if(result1.length>0){
            console.log(result1)
            // let queryForAddSalesStaff ='UPDATE sales_staffs_login SET Username = ?, Password = ?,Phone=?,`SubDistrict`=?,Email=? WHERE Username=? AND Phone=?'
            let queryForAddSalesStaff ='UPDATE sales_staffs_login SET Username = ?, Password = ?,Phone=?,Email=? WHERE Username=? AND Phone=?'
            let values = [
            [username,password,phone,subDistrict,email]
            ];
            con.query(queryForAddSalesStaff,[username,password,phone,email,prevName,prevPhone],function (err, result2) {
                if (err) throw err;
                // console.log(result2)
                
                // const deleteFunPromise = new Promise(deleteDuplicateFromSalesStaffSubDist)

                // deleteFunPromise.then((x)=>{
                //     console.log('fun complteted',x)
                // })

                console.log('hi how r you')
                console.log("SSID  ",salesStaffID)
                let queryForDelete = 'DELETE FROM sales_staffs_subdistricts WHERE SalesStaffID = ?'
                    // subDistrict.map((x,i)=>{
                        // console.log(x)
                con.query(queryForDelete,[salesStaffID],function (err, result4) {
                            if (err) throw err;
                            console.log("e",result4)
                            // if(i===subDistrict.length-1){
                                insertSalesStaffSubDistrict()
                            // }
                            
                 })
                // })
                // console.log("asdadad")
                let insertSalesStaffSubDistrict = () =>{
                    subDistrict.map((x,i)=>{
                        let queryForAddSalesStaff = "INSERT INTO sales_staffs_subdistricts (`SalesStaffID`,`SubDistrict`) VALUES ?";
                        let values = [
                        [salesStaffID,x]
                        ];
                        con.query(queryForAddSalesStaff,[values],function (err, result3) {
                            if (err) throw err;
                            // console.log(result3)
                            if(i===subDistrict.length-1){
                                return res.json({flag:true})
                            }
                        });
                     })
                }
                


            });

        }else{
            return res.json({flag:false})
            
        }
        // const deleteDuplicateFromSalesStaffSubDist = () =>{
        //     console.log('hi how r you')
        //     let queryForDelete = 'DELETE FROM sales_staffs_subdistricts WHERE SalesStaffID = ? AND SubDistrict = ?'
        //     subDistrict.map(x=>{
        //         console.log(x)
        //         con.query(queryForDelete,[salesStaffID,x],function (err, result4) {
        //             if (err) throw err;
        //             console.log("e",result4)
                    
        //         })
        //     })
        //     // return
            
        // }

        

    });
    
})


app.post('/dashboard_data',verifyToken,(req,res)=>{
    
    let subDistrict = []
   
    let date = req.body.date.split('-')
    console.log("sadad",date)
    
    let franchiseID = req.query.fid;
    let salesStaffID = req.query.id
    if(franchiseID){
        let queryForSubDist = `SELECT * FROM franchises_subdistricts WHERE FranchiseID=?`
        con.query(queryForSubDist,[franchiseID],function(err, result5) {
            if (err) {
                console.log("Errore login: " + err);
            } else {
            
                if(result5.length>0){
                    result5.map(x=>{
                        subDistrict.push(x['SubDistrict'])
                     })
                     selectDashBoardData()
         
                }    
               
            }
})

    }else if(salesStaffID){
        let query1 = `SELECT * FROM sales_staffs_subdistricts WHERE SalesStaffID=?`
        con.query(query1,[salesStaffID],function (err, result4) {
            if (err) throw err;
            if(result4.length>0){
                    result4.map(x=>{
                        subDistrict.push(x['SubDistrict'])
                     })
                selectDashBoardData()
            }else{
            }
    
        })
    }else{
        selectDashBoardData()
    }
    function selectDashBoardData(){


        // const fetchSalesStaffSubscriptions = ()=>{

            let sortedSubSS; //subscriptions of sales staff

            let queryForSSSub = `SELECT * FROM sales_staffs_subscriptions WHERE SalesStaffID =?` ;
                con.query(queryForSSSub,[salesStaffID],function(err, result7) {
                    if(err) throw err
                    let subStudentsUnderSalesStaffArr = []
                    result7.map(x=>{
                        subStudentsUnderSalesStaffArr.push(x['StudentID'])
                    })
                    console.log("sdfsfsfsfsfd",subStudentsUnderSalesStaffArr)
                    let query1 = 'SELECT * FROM subscriptions' ;
                    con.query(query1,function(err,result8){
                        // console.log("5455",result8)
        
                        if(err) throw err
                        else if(result8.length>0){
                            sortedSubSS = result8.filter(x=>{
                                if(subStudentsUnderSalesStaffArr.includes(x['Ref ID'])){
                                    return x
                                }
                            })
                            console.log(sortedSubSS.length)

                            var query = "SELECT * FROM subscriptions";
                            con.query(query, function(err, result1) {
                                if (err) {
                                    console.log("Errore login: " + err);
                                } else {
                                    console.log(result1.length)
                                    let sortedSub = result1.filter(x=>{
                                        if(subDistrict.length===0){
                                            
                                            return x
                                        }else{
                                            for(let i=0;i<subDistrict.length;i++){
                                                if(x['Sub-District']===subDistrict[i]){
                                                    return x
                                                }
                                            }
                                        }
                                        
                                    
                                    })
                                
                                    
                                    

                                    const monthWiseDataCollector = (totData)=>{
                                        let sortedSub2 = totData.filter(x=>{    // this month data
                                            if(x['Date'].split('-')[1]===date[1] && x['Date'].split('-')[2]===date[2]){
                                                return x
                                            }
                                        })
                                        return sortedSub2
                                    }
                                    
                                    const dayWiseDataCollector = (totData)=>{
                                        let sortedSub3 = totData.filter(x=>{   // today data
                                            if(x['Date'].split('-')[0]===date[0] && x['Date'].split('-')[1]===date[1]  && x['Date'].split('-')[2]===date[2]){
                                                return x
                                            }
                                        })
                                        return sortedSub3
                                    }
                                    let sortedSub2,sortedSub3
                                    if(subDistrict.length===0){ //For Admin
                                    sortedSub2 = monthWiseDataCollector(result1)
                                    sortedSub3 = dayWiseDataCollector(result1)

                                    }else{ //For Franchise and Sales staff
                                        if(franchiseID){
                                            sortedSub2 = monthWiseDataCollector(sortedSub)
                                            sortedSub3 = dayWiseDataCollector(sortedSub)
                                        }
                                        else if(salesStaffID){
                                            sortedSub = sortedSubSS
                                            sortedSub2 = monthWiseDataCollector(sortedSubSS)
                                            sortedSub3 = dayWiseDataCollector(sortedSubSS)
                                          

                                        }
                                    }


                                    var query = "SELECT * FROM registrations";
                                    con.query(query, function(err, result2) {
                                        if (err) {
                                            console.log("Errore login: " + err);
                                        } else {
                                            let sortedReg = result2.filter(x=>{
                                                if(subDistrict.length===0){
                                                    return x
                                                }else{
                                                    for(let i=0;i<subDistrict.length;i++){
                                                        if(x['Sub-District']===subDistrict[i]){
                                                            return x
                                                        }
                                                    }
                                                }
                                                
                                            })
                                            let sortedReg2 = sortedReg.filter(x=>{   // today data
                                                if(x['Date'].split('-')[0]===date[0] && x['Date'].split('-')[1]===date[1]  && x['Date'].split('-')[2]===date[2]){
                                                    return x
                                                }
                                            })

                                            //Graph Month wise Data Generation

                                            const graphMonthWiseDataGeneration = (totData,i,subDistArray) =>{
                                                let sortedData = totData.filter(x=>{    // this month data
                                                    if(subDistArray.length===0){
                                                        if(x['Date'].split('-')[1]===i){
                                                            return x
                                                        }
                                                    }else{
                                                        for(let j=0;j<subDistrict.length;j++){
                                                            if(x['Date'].split('-')[1]===i && x['Sub-District']===subDistrict[j]){
                                                                return x
                                                            }
                                                        }
                                                        
                                                    }
                                                    
                                                    
                                                })
                                                return sortedData.length
                                            }
                                            let monthSubArray = []
                                            let monthRegArray = []

                                            for(let i=1;i<=12;i++){

                                                if(i<10){
                                                    i = "0"+i
                                                }
                                                monthSubArray.push(graphMonthWiseDataGeneration(result1,i.toString(),subDistrict))
                                                monthRegArray.push(graphMonthWiseDataGeneration(result2,i.toString(),subDistrict))
                                            }   
                                        

                                                res.json({reg:sortedReg.length,sub:sortedSub.length,
                                                monthDataSub:sortedSub2.length,dayDataSub:sortedSub3.length,
                                                dayDataReg:sortedReg2.length,graphMonthSubArray:monthSubArray,graphMonthRegArray:monthRegArray})
                                    
                                }
                            })
                                }
                            })
                            // return sortedSubSS
                        }
        
                        
                    })
        
                })
        
            
        // }
    

    
    // console.log("sorted/////",sortedSubSS)

    
    
    }

    

})


app.get('/one_franchise',(req,res)=>{
    console.log("start**************")
    let franchiseID = req.query.fid

    console.log('ffIDDD ',franchiseID)
        let queryForSubDist = `SELECT * FROM franchises_subdistricts WHERE FranchiseID='${franchiseID}'`
        con.query(queryForSubDist, function(err, result5) {
            if (err) {
                console.log("Errore login: " + err);
            } else {
                console.log("res -----",result5.length)
                subDistArray = []
                result5.map(x=>{
                    subDistArray.push(x['SubDistrict'])
                })
                console.log(subDistArray)
                oneFranchiseCalc(subDistArray)
    
            }
        })

        const oneFranchiseCalc = (subDistArray)=>{

            let query1 = 'SELECT * FROM sales_staffs_subdistricts WHERE SubDistrict = ?'
            con.query(query1,[subDistArray],function (err, result1) {
                if (err) throw err;
                console.log(result1)
                //deleteSalesStaffFromLoginData()
                if(result1.length>0){
                        console.log("123",result1)
                    //   return res.json({flag:false})
        
                }else{
                    // console.log("456")
        
                }
        
            })

        }

})

app.post('/add_sub_data',(req,res)=>{
    console.log("**************sub")
    const data = req.body.subData
    // console.log(data)
    let queryForGettingMaxId = 'select max(No) from subscriptions'
    con.query(queryForGettingMaxId, [data], function(err, result) {
            if(err) throw err
            // console.log(result[0]['max(No)']);
            let maxIdLength = result[0]['max(No)'];
            data.map(x=>{
                x[0] = ++maxIdLength
            })
            let queryForAddSub =  "INSERT INTO subscriptions VALUES ?";
            con.query(queryForAddSub, [data], function(err, result) {
                if(err) {
                    console.log(err)
                    res.json({err:true})
                }
                else{
                    console.log(result);
                    res.json({err:false})
                }
                
                

            });
            
    });
    
    
})

app.post('/add_reg_data',(req,res)=>{
    const data = req.body.subData
    
    let queryForGettingMaxId = 'select max(No) from registrations'
    con.query(queryForGettingMaxId, [data], function(err, result) {
            if(err) throw err
            // console.log(result[0]['max(No)']);
            let maxIdLength = result[0]['max(No)'];
            data.map(x=>{
                x[0] = ++maxIdLength
            })
            let queryForAddSub =  "INSERT INTO registrations VALUES ?";
            con.query(queryForAddSub, [data], function(err, result) {
                if(err) {
                    console.log(err)
                    res.json({err:true})
                }else{
                    console.log(result);
                    res.json({err:false})
                }
               

                

            });
            
    });
    
    
})

app.get('*',(req,res)=>{
res.sendFile(path.join(__dirname, 'build', '404.html'))

//res.send('<h1>Page Not Found</h1>')
})


app.listen(process.env.PORT || 5000

, () => {
    console.log("server started",process.env.PORT,process.env.NODE_ENV)
})

function verifyToken(req, res, next) {
    let tokenQuery = req.query.user
    let authHeader = req.headers.authorization;
    // console.log("authsljdajd",authHeader)
    if (authHeader == undefined && tokenQuery == undefined) {
         console.log("hapsdl")
        //return res.sendFile(path.join(__dirname, 'build', 'AuthFailed.html'))
        return res.status(401).send({ auth: false })
    }
    let token;
    if (authHeader == undefined) {
        token = tokenQuery
    } else {
        token = authHeader.split(" ")[1]
    }

    jwt.verify(token, "123", function(err, decoded) {
        if (err) {
	console.log('t',token)
	return res.status(401).send({ auth: false })	
	//res.sendFile(path.join(__dirname, 'build', 'index.html'));
          //  res.sendFile(path.join(__dirname, 'build', 'AuthFailed.html'))
        } else {
            
            // res.json({ body_: decoded })
            next()


        }
    })

}

