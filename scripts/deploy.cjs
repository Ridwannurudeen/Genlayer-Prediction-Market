const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying PredictionMarketFactory to Base Sepolia...\n");

  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deployer address:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy Factory
  console.log("Deploying PredictionMarketFactory...");
  const Factory = await hre.ethers.getContractFactory("PredictionMarketFactory");
  const factory = await Factory.deploy();
  
  await factory.waitForDeployment();
  
  const factoryAddress = await factory.getAddress();
  console.log("✅ PredictionMarketFactory deployed to:", factoryAddress);
  
  // Wait for confirmations
  console.log("\nWaiting for confirmations...");
  await factory.deploymentTransaction().wait(5);
  
  // Verify contract
  console.log("\n📝 Verifying contract on BaseScan...");
  try {
    await hre.run("verify:verify", {
      address: factoryAddress,
      constructorArguments: [],
    });
    console.log("✅ Contract verified!");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("Contract already verified!");
    } else {
      console.log("Verification failed:", error.message);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(50));
  console.log("Network:          Base Sepolia (Chain ID: 84532)");
  console.log("Factory Address: ", factoryAddress);
  console.log("Deployer:        ", deployer.address);
  console.log("Block Explorer:   https://sepolia.basescan.org/address/" + factoryAddress);
  console.log("=".repeat(50));
  
  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: "baseSepolia",
    chainId: 84532,
    factoryAddress: factoryAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockExplorer: `https://sepolia.basescan.org/address/${factoryAddress}`,
  };
  
  fs.writeFileSync(
    "deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n✅ Deployment info saved to deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
