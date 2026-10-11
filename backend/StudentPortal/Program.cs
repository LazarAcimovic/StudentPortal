using AutoMapper;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using StudentPortal.Handlers;
using StudentPortal.Interfaces;
using StudentPortal.Models.Entities;
using StudentPortal.Profiles;
using StudentPortal.Repositories;
using StudentPortal.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Fail fast on missing or weak configuration
var jwtKey = builder.Configuration["JwtConfig:Key"]
    ?? throw new InvalidOperationException("JwtConfig:Key is missing from configuration.");
var jwtIssuer = builder.Configuration["JwtConfig:Issuer"]
    ?? throw new InvalidOperationException("JwtConfig:Issuer is missing from configuration.");
var jwtAudience = builder.Configuration["JwtConfig:Audience"]
    ?? throw new InvalidOperationException("JwtConfig:Audience is missing from configuration.");
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("ConnectionStrings:DefaultConnection is missing from configuration.");
if (Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("JwtConfig:Key must be at least 32 bytes.");

var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
    ?? throw new InvalidOperationException("Cors:Origins is missing from configuration.");

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowConfiguredOrigins",
        policy =>
        {
            policy.WithOrigins(corsOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
});



// Add services to the container.

// Registracija DbContext-a
builder.Services.AddDbContext<StudentPortalApiContext>(options =>
    options.UseNpgsql(connectionString));

// Registracija AutoMappera

// Registracija repozitorija za Dependency Injection
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ISubjectRepository, SubjectRepository>();
builder.Services.AddScoped<IEnrollmentRepository, EnrollmentRepository>();
builder.Services.AddScoped<IGradeRepository, GradeRepository>();

// Registracija servisa za Dependency Injection
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ISubjectService, SubjectService>();
builder.Services.AddScoped<IEnrollmentService, EnrollmentService>();
builder.Services.AddScoped<IGradeService, GradeService>();
builder.Services.AddScoped<IJwtService, JwtService>();

builder.Services.AddAutoMapper(cfg =>
{
   
    cfg.AddProfile<MappingProfile>();
}, typeof(MappingProfile).Assembly);

builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    var jwtSecurityScheme = new OpenApiSecurityScheme
    {
        BearerFormat = "JWT",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = JwtBearerDefaults.AuthenticationScheme,
        Description = "Enter your JWT Access Token",
        Reference = new OpenApiReference
        {
            Id = JwtBearerDefaults.AuthenticationScheme,
            Type = ReferenceType.SecurityScheme
        }
    };

    options.AddSecurityDefinition("Bearer", jwtSecurityScheme);
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { jwtSecurityScheme, Array.Empty<string>() }
    });
});



builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha512 },
        ClockSkew = TimeSpan.FromSeconds(30)
    };
});
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
    options.AddPolicy("ProfessorOnly", policy => policy.RequireRole("Professor"));
    options.AddPolicy("StudentOnly", policy => policy.RequireRole("Student"));
});
builder.Services.AddScoped<JwtService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();


app.UseCors("AllowConfiguredOrigins");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();