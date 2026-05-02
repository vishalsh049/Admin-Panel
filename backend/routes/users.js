const express = require("express");
const router = express.Router();
const sequelize = require("../config/db");
const bcrypt = require("bcryptjs");
const { QueryTypes } = require("sequelize");

/* GET ALL USERS */

router.get("/", async (req, res) => {

  try {

    const users = await sequelize.query(
      "SELECT id,name,email,password,role FROM users",
      {
        type: QueryTypes.SELECT
      }
    );

    res.json(users);

  } catch (error) {

    console.log(error);
    res.status(500).json({ message: "Server error" });

  }

});

router.put("/:id", async (req,res)=>{

try{

const { id } = req.params;
const { name,email,role,password } = req.body;

/* check if email already exists for another user */

const existing = await sequelize.query(
"SELECT id FROM users WHERE email=:email AND id!=:id",
{
replacements:{ email,id },
type:QueryTypes.SELECT
}
);

if(existing.length > 0){
return res.status(400).json({message:"Email already used by another user"});
}

let query = `
UPDATE users
SET name=:name,email=:email,role=:role
`;

let replacements = { name,email,role,id };

if(password && password.trim() !== ""){
const hash = await bcrypt.hash(password,10);
query += ", password=:password";
replacements.password = hash;
}

query += " WHERE id=:id";

await sequelize.query(query,{
replacements,
type:QueryTypes.UPDATE
});

res.json({message:"User updated successfully"});

}catch(error){

console.error("UPDATE USER ERROR:", error);
res.status(500).json({message:"Failed to update user"});

}

});

router.post("/", async (req,res)=>{

try{

const { name,email,password,role } = req.body;

console.log("Incoming Data:", req.body);

if(!name || !email || !password || !role){
 return res.status(400).json({message:"All fields required"});
}

const hash = await bcrypt.hash(password,10);

await sequelize.query(
`INSERT INTO users (name,email,password,role)
VALUES (:name,:email,:password,:role)`,
{
replacements:{
name,
email,
password:hash,
role
},
type:QueryTypes.INSERT
}
);

res.json({message:"User created successfully"});

}catch(error){

console.error("CREATE USER ERROR:", error);
res.status(500).json({message:error.message});

}

});

router.delete("/:id", async (req,res)=>{

try{

const { id } = req.params;

await sequelize.query(
"DELETE FROM users WHERE id=:id",
{
replacements:{ id },
type:QueryTypes.DELETE
}
);

res.json({message:"User deleted"});

}catch(error){

console.error("DELETE ERROR:", error);
res.status(500).json({message:"Delete failed"});

}

});

module.exports = router;
