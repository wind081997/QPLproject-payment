require('dotenv').config();
const Xendit = require('xendit-node');

const xendit = new Xendit({
    secretKey: process.env.XENDIT_API_KEY,
});

async function createSplitRule() {
    try {
        console.log('🔧 Creating Xendit Split Rule...');
        console.log('🔍 Using API Key:', process.env.XENDIT_API_KEY ? 'Found' : 'Missing');
        
        // Check what's available in the xendit object
        console.log('🔍 Available xendit methods:', Object.keys(xendit));
        
        // Check if Platform is available (this contains split rules)
        if (xendit.Platform) {
            console.log('✅ Platform object found');
            console.log('🔍 Platform methods:', Object.keys(xendit.Platform));
        } else {
            console.log('❌ Platform object not found');
        }
        
        // Try to create split rule using Platform
        const splitRule = await xendit.Platform.createSplitRule({
            name: 'Dr.Lab Platform Commission',
            description: '10% platform commission, 90% to healthcare provider',
            split_type: 'percentage',
            rules: [
                {
                    recipient_type: 'account',
                    recipient_id: process.env.XENDIT_PLATFORM_ACCOUNT_ID,
                    percentage: 10,
                    description: 'Dr.Lab Platform Commission'
                },
                {
                    recipient_type: 'sub_account',
                    recipient_id: '{{sub_account_id}}',
                    percentage: 90,
                    description: 'Healthcare Provider Payment'
                }
            ]
        });

        console.log('✅ Split Rule Created Successfully!');
        console.log('ID:', splitRule.id);
        console.log('Name:', splitRule.name);
        console.log('Status:', splitRule.status);
        
        console.log('\n Add this to your .env file:');
        console.log(`XENDIT_SPLIT_RULE_ID=${splitRule.id}`);
        
        return splitRule.id;
    } catch (error) {
        console.error('❌ Error creating split rule:', error);
        console.error('Error details:', error.response?.data || error.message);
        
        // Try alternative approaches
        console.log('\n Trying alternative approach...');
        await tryAlternativeApproach();
    }
}

async function tryAlternativeApproach() {
    try {
        console.log(' Trying alternative split rule creation...');
        
        // Method 1: Try Platform.createSplitRule
        if (xendit.Platform && xendit.Platform.createSplitRule) {
            console.log('✅ Platform.createSplitRule found');
            try {
                const splitRule = await xendit.Platform.createSplitRule({
                    name: 'Dr.Lab Platform Commission',
                    description: '10% platform commission, 90% to healthcare provider',
                    split_type: 'percentage',
                    rules: [
                        {
                            recipient_type: 'account',
                            recipient_id: process.env.XENDIT_PLATFORM_ACCOUNT_ID,
                            percentage: 10,
                            description: 'Dr.Lab Platform Commission'
                        },
                        {
                            recipient_type: 'sub_account',
                            recipient_id: '{{sub_account_id}}',
                            percentage: 90,
                            description: 'Healthcare Provider Payment'
                        }
                    ]
                });
                
                console.log('✅ Split Rule Created via Platform!');
                console.log('ID:', splitRule.id);
                console.log('Name:', splitRule.name);
                console.log('Status:', splitRule.status);
                
                console.log('\n Add this to your .env file:');
                console.log(`XENDIT_SPLIT_RULE_ID=${splitRule.id}`);
                
                return splitRule.id;
            } catch (platformError) {
                console.log('⚠️ Platform.createSplitRule failed:', platformError.message);
            }
        }
        
        // Method 2: Try direct API call
        console.log(' Trying direct API call...');
        await tryDirectApiCall();
        
        // Method 3: Check if split rules are available at all
        console.log(' Checking if split rules are available...');
        await checkSplitRulesAvailability();
        
    } catch (error) {
        console.error('❌ Alternative approach failed:', error);
    }
}

async function tryDirectApiCall() {
    try {
        const https = require('https');
        const querystring = require('querystring');
        
        const postData = JSON.stringify({
            name: 'Dr.Lab Platform Commission',
            description: '10% platform commission, 90% to healthcare provider',
            split_type: 'percentage',
            rules: [
                {
                    recipient_type: 'account',
                    recipient_id: process.env.XENDIT_PLATFORM_ACCOUNT_ID,
                    percentage: 10,
                    description: 'Dr.Lab Platform Commission'
                },
                {
                    recipient_type: 'sub_account',
                    recipient_id: '{{sub_account_id}}',
                    percentage: 90,
                    description: 'Healthcare Provider Payment'
                }
            ]
        });
        
        const options = {
            hostname: 'api.xendit.co',
            port: 443,
            path: '/split-rules',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(process.env.XENDIT_API_KEY + ':').toString('base64')}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (res.statusCode === 200 || res.statusCode === 201) {
                            console.log('✅ Split Rule Created via Direct API!');
                            console.log('ID:', response.id);
                            console.log('Name:', response.name);
                            console.log('Status:', response.status);
                            
                            console.log('\n Add this to your .env file:');
                            console.log(`XENDIT_SPLIT_RULE_ID=${response.id}`);
                            
                            resolve(response.id);
                        } else {
                            console.log('❌ Direct API call failed:', response);
                            reject(new Error(response.message || 'API call failed'));
                        }
                    } catch (parseError) {
                        console.log('❌ Failed to parse response:', data);
                        reject(parseError);
                    }
                });
            });
            
            req.on('error', (error) => {
                console.log('❌ Direct API request failed:', error);
                reject(error);
            });
            
            req.write(postData);
            req.end();
        });
        
    } catch (error) {
        console.log('⚠️ Direct API call failed:', error.message);
    }
}

async function checkSplitRulesAvailability() {
    try {
        // Check if we can list existing split rules
        if (xendit.Platform && xendit.Platform.listSplitRules) {
            const existingRules = await xendit.Platform.listSplitRules();
            console.log('📋 Existing split rules:', existingRules);
        } else {
            console.log('❌ Cannot list split rules - feature may not be available');
        }
        
        // Check account capabilities
        console.log('🔍 Checking account capabilities...');
        console.log('Available methods:', Object.keys(xendit));
        
        // Check if we have the right permissions
        if (xendit.Platform) {
            console.log('✅ Platform access available');
        } else {
            console.log('❌ Platform access not available');
        }
        
    } catch (error) {
        console.log('⚠️ Could not check split rules availability:', error.message);
    }
}

// Run the script
createSplitRule()
    .then(id => {
        if (id) {
            console.log('\n✅ Setup complete!');
            console.log('📝 Next steps:');
            console.log('1. Add XENDIT_SPLIT_RULE_ID to your .env file');
            console.log('2. Test the split rule with a payment');
        } else {
            console.log('\n⚠️ Split rule creation failed');
            console.log('📝 Alternative options:');
            console.log('1. Contact Xendit support to enable split rules');
            console.log('2. Use manual split approach (implemented in code)');
            console.log('3. Upgrade your Xendit account type');
        }
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    });
